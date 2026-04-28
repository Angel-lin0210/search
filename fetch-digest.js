const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const NEWSAPI_KEY = process.env.NEWSAPI_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || process.env.GMAIL_USER;
const VERCEL_URL = 'search-six-rose.vercel.app';

console.log('=== 環境變數檢查 ===');
console.log('ANTHROPIC_API_KEY:', ANTHROPIC_API_KEY ? `已設定 (${ANTHROPIC_API_KEY.substring(0, 20)}...)` : '未設定 ❌');
console.log('NEWSAPI_KEY:', NEWSAPI_KEY ? `已設定 (${NEWSAPI_KEY.substring(0, 10)}...)` : '未設定 ❌');
console.log('GMAIL_USER:', GMAIL_USER ? '已設定 ✅' : '未設定 ❌');
console.log('GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '已設定 ✅' : '未設定 ❌');
console.log('RECIPIENT_EMAIL:', RECIPIENT_EMAIL);

// 搜尋真實新聞
async function searchNewsForTopic(topic) {
    if (!NEWSAPI_KEY) {
        console.log(`⚠️  未設定 NEWSAPI_KEY，跳過 ${topic.name} 的新聞搜尋`);
        return [];
    }

    console.log(`  🔍 搜尋新聞: ${topic.keywords}`);
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(topic.keywords)}&language=zh&sortBy=publishedAt&pageSize=5&apiKey=${NEWSAPI_KEY}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'ok' && data.articles && data.articles.length > 0) {
            console.log(`  ✅ 找到 ${data.articles.length} 篇新聞`);
            return data.articles.map(article => ({
                title: article.title,
                description: article.description || '',
                url: article.url,
                publishedAt: article.publishedAt,
                source: article.source.name
            }));
        } else {
            console.log(`  ⚠️  未找到相關新聞`);
            return [];
        }
    } catch (error) {
        console.error(`  ❌ 新聞搜尋失敗:`, error.message);
        return [];
    }
}

// 使用 Claude 分析新聞
async function analyzeNewsWithClaude(topic, newsArticles) {
    if (!ANTHROPIC_API_KEY) {
        console.log(`  ⚠️  未設定 ANTHROPIC_API_KEY，無法分析`);
        return null;
    }

    const newsContext = newsArticles.length > 0 
        ? `\n\n最新新聞:\n${newsArticles.map((article, i) => 
            `${i + 1}. ${article.title}\n   來源: ${article.source}\n   ${article.description}`
          ).join('\n\n')}`
        : '\n\n(未找到最新新聞，請基於產業知識分析)';

    const prompt = `你是電動車產業觀察專家。請分析「${topic.name}」這個主題的重要趨勢。

關鍵字: ${topic.keywords}
${newsContext}

請提供:
1. 摘要 (100字內，整合最新新聞和產業趨勢)
2. 5個關鍵重點 (每個30字內，優先使用新聞中的具體事件)
3. 5個延伸討論問題
4. 3個資料來源 (優先使用提供的新聞)

請用這個 JSON 格式回應,不要有任何其他文字:
{
  "summary": "摘要內容",
  "keyPoints": ["重點1", "重點2", "重點3", "重點4", "重點5"],
  "questions": ["問題1", "問題2", "問題3", "問題4", "問題5"],
  "sources": [
    {"name": "來源1", "url": "https://example.com/1"},
    {"name": "來源2", "url": "https://example.com/2"},
    {"name": "來源3", "url": "https://example.com/3"}
  ]
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

    console.log('  API 回應狀態:', response.status, response.statusText);

    if (!response.ok) {
        const errorText = await response.text();
        console.log('  錯誤內容:', errorText);
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
        console.log('  無法解析 JSON');
        throw new Error('無法解析 Claude 回應');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // 如果有真實新聞,優先使用真實新聞作為來源
    if (newsArticles.length > 0) {
        result.sources = newsArticles.slice(0, 3).map(article => ({
            name: article.title,
            url: article.url
        }));
    }
    
    console.log('  ✅ 分析完成');
    return result;
}

async function fetchRealDigestData() {
    console.log('🔍 開始進行真實資料搜集...');
    console.log('');

    const topics = [
        {
            id: 'policy',
            name: '政策法規',
            icon: '📋',
            keywords: '台灣 電動車 政策 補助 法規'
        },
        {
            id: 'tech',
            name: '技術發展',
            icon: '🔬',
            keywords: '電動車 技術 快充 電池'
        },
        {
            id: 'business',
            name: '商業模式',
            icon: '💼',
            keywords: '電動車 充電站 營運 商業模式'
        },
        {
            id: 'ux',
            name: '使用者體驗',
            icon: '👥',
            keywords: '電動車 車主 使用 體驗'
        }
    ];

    const results = {};

    for (const topic of topics) {
        console.log(`📊 處理主題: ${topic.name}`);
        
        try {
            // 步驟1: 搜尋真實新聞
            const newsArticles = await searchNewsForTopic(topic);
            
            // 步驟2: 讓 Claude 分析新聞
            const analysis = await analyzeNewsWithClaude(topic, newsArticles);
            
            if (analysis) {
                results[topic.id] = analysis;
                console.log(`✅ ${topic.name} 完成`);
            } else {
                console.log(`⚠️  ${topic.name} 分析失敗，使用備用資料`);
                results[topic.id] = {
                    summary: `${topic.name}的最新動態分析暫時無法取得。`,
                    keyPoints: ['資料更新中', '請稍後查看', '系統維護中'],
                    questions: ['為什麼會出現這個狀況?'],
                    sources: []
                };
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

    return results;
}

async function sendEmailNotification(digestData) {
    console.log('');
    console.log('=== 開始發送 Email 📧 ===');
    
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.log('❌ 無法發送 Email - 環境變數未設定');
        return;
    }

    console.log('✅ 環境變數檢查通過');
    
    const date = new Date().toLocaleDateString('zh-TW');
    console.log('📅 報告日期:', date);
    
    console.log('🔧 建立郵件傳送器...');
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

    console.log('📤 發送郵件...');
    
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
                ${topic.sources.map(s => `<a href="${s.url}" class="source-link" target="_blank">${s.name}</a>`).join('')}
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
