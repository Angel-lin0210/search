const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const NEW_API_TOKEN = '6ab04346142a41b4905d4e6c1939cd73';  // 使用固定值
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || process.env.GMAIL_USER;
const VERCEL_URL = 'search-six-rose.vercel.app';

console.log('=== 環境變數檢查 ===');
console.log('ANTHROPIC_API_KEY:', ANTHROPIC_API_KEY ? `已設定 (${ANTHROPIC_API_KEY.substring(0, 20)}...)` : '未設定 ❌');
console.log('NEW_API_TOKEN:', NEW_API_TOKEN ? `已設定 (${NEW_API_TOKEN.substring(0, 10)}...)` : '未設定 ❌');
console.log('GMAIL_USER:', GMAIL_USER ? '已設定 ✅' : '未設定 ❌');
console.log('GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '已設定 ✅' : '未設定 ❌');
console.log('RECIPIENT_EMAIL:', RECIPIENT_EMAIL);

// 載入關鍵字設定檔
function loadKeywordsConfig() {
    const configPath = path.join(__dirname, 'keywords-config.json');
    
    if (fs.existsSync(configPath)) {
        console.log('✅ 載入關鍵字設定檔');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        console.log(`📋 設定檔版本: ${config.version} (更新於 ${config.lastUpdated})`);
        return config.topics;
    } else {
        console.log('⚠️  未找到設定檔，使用預設關鍵字');
        return getDefaultTopics();
    }
}

// 預設關鍵字（備用）
function getDefaultTopics() {
    return [
        {
            id: 'policy',
            name: '政策法規',
            icon: '📋',
            keywords: ['台灣 電動車 政策', '電動車 補助', '充電樁 法規']
        },
        {
            id: 'tech',
            name: '技術發展',
            icon: '🔬',
            keywords: ['電動車 技術', '快充 技術', '電池 技術']
        },
        {
            id: 'business',
            name: '商業模式',
            icon: '💼',
            keywords: ['充電站 營運', '充電樁 商業模式']
        },
        {
            id: 'ux',
            name: '使用者體驗',
            icon: '👥',
            keywords: ['電動車 使用體驗', '充電樁 問題']
        }
    ];
}

// 搜尋真實新聞（使用多個關鍵字）
async function searchNewsForTopic(topic) {
    if (!NEW_API_TOKEN) {
        console.log(`⚠️  未設定 NEW_API_TOKEN，跳過 ${topic.name} 的新聞搜尋`);
        return [];
    }

    console.log(`  🔍 開始搜尋 ${topic.keywords.length} 個關鍵字:`);
    
    const allArticles = [];
    const seenUrls = new Set();
    const searchStats = {};
    
    // 對每個關鍵字進行搜尋
    for (let i = 0; i < topic.keywords.length; i++) {
        const keyword = topic.keywords[i];
        console.log(`     [${i + 1}/${topic.keywords.length}] "${keyword}"`);
        
        // 限制只搜尋台灣主流新聞網站
        const domains = 'udn.com,ltn.com.tw,cna.com.tw,chinatimes.com,storm.mg,technews.tw,ctee.com.tw';
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keyword)}&domains=${domains}&language=zh&sortBy=publishedAt&pageSize=5&apiKey=${NEW_API_TOKEN}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'ok' && data.articles && data.articles.length > 0) {
                let newArticles = 0;
                // 去重複
                data.articles.forEach(article => {
                    if (!seenUrls.has(article.url)) {
                        seenUrls.add(article.url);
                        allArticles.push({
                            title: article.title,
                            description: article.description || '',
                            url: article.url,
                            publishedAt: article.publishedAt,
                            source: article.source.name,
                            keyword: keyword  // 記錄是哪個關鍵字找到的
                        });
                        newArticles++;
                    }
                });
                searchStats[keyword] = newArticles;
                console.log(`        ✅ 找到 ${data.articles.length} 篇，新增 ${newArticles} 篇`);
            } else {
                searchStats[keyword] = 0;
                console.log(`        ⚠️  未找到新聞`);
            }
            
            // 避免超過 NewsAPI 的 rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            searchStats[keyword] = 0;
            console.error(`        ❌ 搜尋失敗: ${error.message}`);
        }
    }
    
    // 按發布時間排序，取最新的 10 篇
    allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const topArticles = allArticles.slice(0, 10);
    
    console.log(`\n  📊 搜尋統計:`);
    console.log(`     總搜尋關鍵字: ${topic.keywords.length} 個`);
    console.log(`     總找到新聞: ${allArticles.length} 篇`);
    console.log(`     取用最新: ${topArticles.length} 篇`);
    
    // 顯示每個關鍵字的貢獻度
    const contributingKeywords = Object.entries(searchStats).filter(([k, v]) => v > 0);
    if (contributingKeywords.length > 0) {
        console.log(`     有效關鍵字: ${contributingKeywords.length}/${topic.keywords.length}`);
        console.log(`     最佳關鍵字:`);
        contributingKeywords
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .forEach(([kw, count]) => {
                console.log(`       • "${kw}": ${count} 篇`);
            });
    }
    console.log('');
    
    return topArticles;
}

// 使用 Claude 分析新聞
async function analyzeNewsWithClaude(topic, newsArticles) {
    if (!ANTHROPIC_API_KEY) {
        console.log(`  ⚠️  未設定 ANTHROPIC_API_KEY，無法分析`);
        return null;
    }

    const newsContext = newsArticles.length > 0 
        ? `\n\n最新新聞 (${newsArticles.length} 篇):\n${newsArticles.map((article, i) => 
            `${i + 1}. 【${article.source}】${article.title}\n   ${article.description}\n   關鍵字: ${article.keyword}`
          ).join('\n\n')}`
        : '\n\n(未找到最新新聞，請基於產業知識分析)';

    const prompt = `你是電動車產業觀察專家。請分析「${topic.name}」這個主題的重要趨勢。

搜尋範圍: ${topic.keywords.join('、')}
${newsContext}

請提供:
1. 摘要 (100字內，整合最新新聞和產業趨勢，優先使用新聞中的具體事件)
2. 5個關鍵重點 (每個30字內，必須基於提供的新聞內容，包含具體案例或數據)
3. 5個延伸討論問題
4. 資料來源會自動使用提供的新聞

請用這個 JSON 格式回應,不要有任何其他文字:
{
  "summary": "摘要內容",
  "keyPoints": ["重點1", "重點2", "重點3", "重點4", "重點5"],
  "questions": ["問題1", "問題2", "問題3", "問題4", "問題5"]
}`;

    console.log('  📤 發送給 Claude 分析...');
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{
                role: 'user',
                content: prompt
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.log('  ❌ Claude API 失敗:', errorText);
        throw new Error(`Claude API 失敗: ${response.status}`);
    }

    const data = await response.json();
    let resultText = '';
    if (data.content && Array.isArray(data.content)) {
        for (const block of data.content) {
            if (block.type === 'text') {
                resultText += block.text;
            }
        }
    }

    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('無法解析 Claude 回應');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // 使用真實新聞作為來源
    if (newsArticles.length > 0) {
        result.sources = newsArticles.slice(0, 5).map(article => ({
            name: article.title,
            url: article.url,
            source: article.source,
            publishedAt: article.publishedAt
        }));
    } else {
        result.sources = [];
    }
    
    console.log('  ✅ 分析完成');
    return result;
}

async function fetchRealDigestData() {
    console.log('🔍 開始進行真實資料搜集...');
    console.log('');

    const topics = loadKeywordsConfig();
    const results = {};

    // 顯示所有即將使用的關鍵字
    console.log('📋 === 關鍵字設定總覽 ===');
    topics.forEach(topic => {
        console.log(`\n【${topic.name}】 共 ${topic.keywords.length} 個關鍵字:`);
        topic.keywords.forEach((kw, i) => {
            console.log(`  ${i + 1}. "${kw}"`);
        });
    });
    console.log('\n=========================\n');

    for (const topic of topics) {
        console.log(`📊 處理主題: ${topic.name}`);
        console.log(`   準備搜尋 ${topic.keywords.length} 個關鍵字...`);
        console.log('');
        
        try {
            const newsArticles = await searchNewsForTopic(topic);
            const analysis = await analyzeNewsWithClaude(topic, newsArticles);
            
            if (analysis) {
                results[topic.id] = analysis;
                console.log(`✅ ${topic.name} 完成`);
                console.log(`   📰 共找到 ${newsArticles.length} 篇新聞`);
                console.log(`   📝 生成 ${analysis.keyPoints.length} 個關鍵重點`);
                console.log(`   💡 提出 ${analysis.questions.length} 個討論問題`);
                if (analysis.sources && analysis.sources.length > 0) {
                    console.log(`   🔗 包含 ${analysis.sources.length} 個新聞來源`);
                }
            }
            console.log('');
        } catch (error) {
            console.error(`❌ ${topic.name} 處理失敗:`, error.message);
            results[topic.id] = {
                summary: `處理 ${topic.name} 時發生錯誤。`,
                keyPoints: ['系統錯誤', '請稍後再試'],
                questions: ['發生了什麼問題?'],
                sources: []
            };
            console.log('');
        }
    }

    // 執行完成後的統計報告
    console.log('\n📊 === 執行統計報告 ===');
    Object.keys(results).forEach(key => {
        const topic = topics.find(t => t.id === key);
        const result = results[key];
        const sourcesCount = result.sources ? result.sources.length : 0;
        console.log(`${topic.icon} ${topic.name}: ${sourcesCount} 篇新聞來源`);
    });
    console.log('=========================\n');

    return results;
}

async function sendEmailNotification(digestData) {
    console.log('');
    console.log('=== 開始發送 Email 📧 ===');
    
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.log('❌ 無法發送 Email - 環境變數未設定');
        return;
    }

    const date = new Date().toLocaleDateString('zh-TW');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: GMAIL_USER,
            pass: GMAIL_APP_PASSWORD
        }
    });

    const textContent = `電動車生態每日觀察\n${date}\n\n完整報告: https://${VERCEL_URL}\n\n📋 政策法規\n${digestData.policy.summary}\n\n🔬 技術發展\n${digestData.tech.summary}\n\n💼 商業模式\n${digestData.business.summary}\n\n👥 使用者體驗\n${digestData.ux.summary}\n\n`;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft JhengHei',sans-serif;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#1a73e8 0%,#4285f4 100%);padding:32px 24px;text-align:center;">
<h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#ffffff;">⚡ 電動車生態每日觀察</h1>
<p style="margin:0;font-size:14px;color:#ffffff;opacity:0.95;">📅 ${date}</p>
<p style="margin:8px 0 0 0;font-size:13px;color:#ffffff;opacity:0.9;">✨ 基於真實新聞來源分析</p>
</td></tr>
<tr><td style="padding:24px;">
${['policy', 'tech', 'business', 'ux'].map(key => {
    const icons = { policy: '📋', tech: '🔬', business: '💼', ux: '👥' };
    const titles = { policy: '政策法規', tech: '技術發展', business: '商業模式', ux: '使用者體驗' };
    const topic = digestData[key];
    
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
<tr><td style="padding:0 0 16px 0;border-bottom:1px solid #e8eaed;">
<h2 style="margin:0;font-size:18px;font-weight:700;color:#202124;">${icons[key]} ${titles[key]}</h2>
</td></tr>
<tr><td style="padding:14px 0;">
<div style="background:#f8f9fa;padding:16px;border-radius:8px;border-left:3px solid #1a73e8;margin-bottom:12px;">
<p style="margin:0;font-size:15px;color:#3c4043;line-height:1.7;">${topic.summary}</p>
</div>
<p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#5f6368;">關鍵重點</p>
${topic.keyPoints.map(point => `<p style="margin:6px 0;padding-left:18px;position:relative;font-size:14px;color:#3c4043;line-height:1.6;"><span style="position:absolute;left:4px;color:#1a73e8;font-weight:bold;">•</span>${point}</p>`).join('')}
${topic.sources && topic.sources.length > 0 ? `
<p style="margin:16px 0 8px 0;font-size:13px;font-weight:600;color:#5f6368;">📰 新聞來源</p>
${topic.sources.slice(0, 3).map(s => `<p style="margin:4px 0;font-size:13px;"><a href="${s.url}" style="color:#1a73e8;text-decoration:none;">${s.name}</a></p>`).join('')}
` : ''}
</td></tr>
</table>`;
}).join('')}
</td></tr>
<tr><td style="padding:24px;background:#f8f9fa;text-align:center;">
<a href="https://${VERCEL_URL}" style="display:inline-block;padding:14px 32px;background-color:#1a73e8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">📖 查看完整報告</a>
</td></tr>
<tr><td style="padding:20px;text-align:center;color:#80868b;font-size:13px;background:#f8f9fa;border-top:1px solid #e8eaed;">
<p style="margin:4px 0;">✨ 系統每日早上 6:00 自動執行</p>
<p style="margin:4px 0;">📊 整合 NewsAPI 真實新聞來源</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

    const mailOptions = {
        from: `"電動車每日觀察" <${GMAIL_USER}>`,
        to: RECIPIENT_EMAIL,
        subject: `⚡ 電動車生態每日觀察 - ${date}`,
        text: textContent,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('🎉 ✅ Email 發送成功!');
        console.log('   Message ID:', info.messageId);
    } catch (error) {
        console.log('❌ Email 發送失敗:', error.message);
    }
}

async function saveToFile(data) {
    const date = new Date().toISOString().split('T')[0];
    const dir = path.join(__dirname, 'digests');
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, `${date}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ 已儲存至: ${filepath}`);
}

async function generateHTMLReport(data) {
    const date = new Date().toLocaleDateString('zh-TW');
    
    const html = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>電動車生態每日觀察 - ${date}</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans TC', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #f8f9fa;
            color: #2c3e50;
            line-height: 1.8;
            padding: 20px;
        }
        .container { max-width: 900px; margin: 0 auto; }
        header {
            text-align: center;
            padding: 40px 20px;
            background: white;
            border-radius: 16px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        h1 { font-size: 2rem; color: #1a73e8; margin-bottom: 12px; }
        .date { color: #5f6368; font-size: 0.95rem; }
        .badge {
            display: inline-block;
            background: #e8f5e9;
            color: #2e7d32;
            padding: 6px 12px;
            border-radius: 12px;
            font-size: 0.85rem;
            margin-top: 8px;
        }
        .topic-card {
            background: white;
            border-radius: 16px;
            padding: 32px;
            margin-bottom: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .topic-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
            padding-bottom: 16px;
            border-bottom: 2px solid #f1f3f4;
        }
        .topic-icon { font-size: 2rem; }
        .topic-title { font-size: 1.5rem; font-weight: 700; }
        .summary {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            border-left: 4px solid #1a73e8;
            line-height: 1.8;
        }
        .points-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 16px;
            color: #202124;
        }
        .point-item {
            padding: 12px 0 12px 24px;
            position: relative;
            line-height: 1.7;
            color: #3c4043;
        }
        .point-item::before {
            content: '•';
            position: absolute;
            left: 8px;
            color: #1a73e8;
            font-weight: bold;
            font-size: 1.2rem;
        }
        .questions-section {
            background: #e8f5e9;
            padding: 24px;
            border-radius: 12px;
            margin-top: 24px;
        }
        .questions-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: #1e7e34;
            margin-bottom: 16px;
        }
        .question-item {
            background: white;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            display: flex;
            gap: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .question-number {
            min-width: 28px;
            height: 28px;
            background: #34a853;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 0.9rem;
        }
        .question-text {
            flex: 1;
            color: #3c4043;
            line-height: 1.6;
        }
        .sources-section {
            margin-top: 24px;
            padding-top: 20px;
            border-top: 2px solid #f1f3f4;
        }
        .sources-title {
            font-size: 0.9rem;
            font-weight: 600;
            color: #5f6368;
            margin-bottom: 12px;
        }
        .source-link {
            display: block;
            margin: 8px 0;
            padding: 12px 16px;
            background: #f1f3f4;
            color: #1a73e8;
            text-decoration: none;
            border-radius: 8px;
            font-size: 0.9rem;
        }
        .source-link:hover {
            background: #e8f0fe;
        }
        .source-meta {
            font-size: 0.8rem;
            color: #5f6368;
            margin-top: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>⚡ 電動車生態每日觀察</h1>
            <p class="date">📅 ${date}</p>
            <span class="badge">✨ 整合真實新聞來源</span>
        </header>
        
        ${['policy', 'tech', 'business', 'ux'].map(key => {
            const icons = { policy: '📋', tech: '🔬', business: '💼', ux: '👥' };
            const titles = { policy: '政策法規', tech: '技術發展', business: '商業模式', ux: '使用者體驗' };
            const topic = data[key];
            
            return `<div class="topic-card">
            <div class="topic-header">
                <span class="topic-icon">${icons[key]}</span>
                <h2 class="topic-title">${titles[key]}</h2>
            </div>
            <div class="summary">${topic.summary}</div>
            <h3 class="points-title">關鍵重點</h3>
            ${topic.keyPoints.map(point => `<div class="point-item">${point}</div>`).join('')}
            
            ${topic.questions && topic.questions.length > 0 ? `
            <div class="questions-section">
                <h3 class="questions-title">💡 延伸討論</h3>
                ${topic.questions.map((q, i) => `
                <div class="question-item">
                    <div class="question-number">${i + 1}</div>
                    <div class="question-text">${q}</div>
                </div>`).join('')}
            </div>` : ''}
            
            ${topic.sources && topic.sources.length > 0 ? `
            <div class="sources-section">
                <div class="sources-title">📰 新聞來源</div>
                ${topic.sources.map(s => `<a href="${s.url}" class="source-link" target="_blank">
                    ${s.name}
                    <div class="source-meta">${s.source} • ${new Date(s.publishedAt).toLocaleDateString('zh-TW')}</div>
                </a>`).join('')}
            </div>` : ''}
        </div>`;
        }).join('')}
    </div>
</body>
</html>`;

    const htmlPath = path.join(__dirname, 'index.html');
    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log('✅ 已生成 HTML 報告');
}

async function main() {
    try {
        console.log('');
        console.log('=== 電動車生態每日觀察系統 ===');
        console.log('=== 整合 NewsAPI 真實新聞 ===');
        console.log('');
        
        const digestData = await fetchRealDigestData();
        
        await saveToFile(digestData);
        await generateHTMLReport(digestData);
        await sendEmailNotification(digestData);
        
        console.log('');
        console.log('=== 搜集完成! ===');
        console.log('');
    } catch (error) {
        console.log('');
        console.log('=== 執行失敗 ===');
        console.error('錯誤:', error);
        console.log('');
        process.exit(1);
    }
}

main();
