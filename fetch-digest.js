const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || process.env.GMAIL_USER;
const VERCEL_URL = 'search-six-rose.vercel.app';

// Google Sheets 設定 - 你需要設定這個!
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID || 'YOUR_SHEET_ID_HERE';
const GOOGLE_SHEET_API_KEY = process.env.GOOGLE_SHEET_API_KEY || '';

console.log('=== 環境變數檢查 ===');
console.log('ANTHROPIC_API_KEY:', ANTHROPIC_API_KEY ? `已設定 (${ANTHROPIC_API_KEY.substring(0, 20)}...)` : '未設定 ❌');
console.log('GMAIL_USER:', GMAIL_USER ? '已設定 ✅' : '未設定 ❌');
console.log('GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '已設定 ✅' : '未設定 ❌');
console.log('GOOGLE_SHEET_ID:', GOOGLE_SHEET_ID !== 'YOUR_SHEET_ID_HERE' ? '已設定 ✅' : '未設定 ⚠️');
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
            keywords: ['台灣 電動車 充電樁 政策', '充電樁 管委會', '區權會 充電樁']
        },
        {
            id: 'tech',
            name: '技術發展',
            icon: '🔬',
            keywords: ['電動車 快充技術', 'EMS 電能管理', 'V2G 雙向充電']
        },
        {
            id: 'business',
            name: '商業模式',
            icon: '💼',
            keywords: ['充電站 營運', '充電樁 投資']
        },
        {
            id: 'ux',
            name: '使用者體驗',
            icon: '👥',
            keywords: ['充電樁 爭議', 'PTT 電動車 充電']
        }
    ];
}

// 從 Google Sheets 載入手動資料
async function loadManualDataFromSheets() {
    console.log('\n📊 === 載入 Google Sheets 資料 ===');
    
    if (GOOGLE_SHEET_ID === 'YOUR_SHEET_ID_HERE') {
        console.log('⚠️  未設定 Google Sheet ID，跳過');
        return loadManualDataFromFile();
    }
    
    try {
        // 使用 Google Sheets API v4 的公開 CSV 匯出功能
        // 格式: https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={SHEET_NAME}
        const sheetName = 'manual-data'; // 工作表名稱
        const url = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
        
        console.log(`🔗 正在讀取: Google Sheets`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`無法讀取 Google Sheets: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // 解析 CSV
        const lines = csvText.split('\n').filter(line => line.trim());
        const manualData = {
            policy: [],
            tech: [],
            business: [],
            ux: []
        };
        
        let count = 0;
        // 跳過第一行 (標題)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            
            // 簡單 CSV 解析 (處理引號內的逗號)
            const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
            const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());
            
            if (cleanParts.length >= 2) {
                const topic = cleanParts[0].toLowerCase(); // policy, tech, business, ux
                const content = cleanParts[1];
                
                if (manualData[topic] && content) {
                    manualData[topic].push(content);
                    count++;
                }
            }
        }
        
        console.log(`✅ 成功載入 ${count} 筆手動資料`);
        console.log(`   📋 政策法規: ${manualData.policy.length} 筆`);
        console.log(`   🔬 技術發展: ${manualData.tech.length} 筆`);
        console.log(`   💼 商業模式: ${manualData.business.length} 筆`);
        console.log(`   👥 使用者體驗: ${manualData.ux.length} 筆`);
        console.log('');
        
        return manualData;
        
    } catch (error) {
        console.error(`❌ 讀取 Google Sheets 失敗: ${error.message}`);
        console.log('⚠️  改用本地 manual-data.json 檔案');
        return loadManualDataFromFile();
    }
}

// 從本地檔案載入手動資料 (備用)
function loadManualDataFromFile() {
    const manualDataPath = path.join(__dirname, 'manual-data.json');
    
    if (fs.existsSync(manualDataPath)) {
        console.log('📄 載入本地 manual-data.json');
        const data = JSON.parse(fs.readFileSync(manualDataPath, 'utf-8'));
        return data;
    }
    
    console.log('⚠️  未找到手動資料');
    return null;
}

// 使用 Google News RSS 搜尋新聞
async function searchNewsWithGoogleRSS(topic) {
    console.log(`  🔍 使用 Google News RSS 搜尋 ${topic.keywords.length} 個關鍵字:`);
    
    const allArticles = [];
    const seenTitles = new Set();  // 改用標題去重
    const searchStats = {};
    
    for (let i = 0; i < topic.keywords.length; i++) {
        const keyword = topic.keywords[i];
        console.log(`     [${i + 1}/${topic.keywords.length}] "${keyword}"`);
        
        const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(keyword)}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
        
        try {
            const response = await fetch(rssUrl);
            const xmlText = await response.text();
            
            const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];
            
            let newArticles = 0;
            for (const item of items.slice(0, 5)) {
                // 嘗試多種方式解析標題
                let title = null;
                let url = null;
                let pubDate = null;
                
                // 方式1: CDATA 格式
                let titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
                if (!titleMatch) {
                    // 方式2: 普通標題標籤
                    titleMatch = item.match(/<title>(.*?)<\/title>/);
                }
                
                const linkMatch = item.match(/<link>(.*?)<\/link>/);
                const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
                const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
                
                if (titleMatch) {
                    title = titleMatch[1];
                }
                
                if (linkMatch) {
                    url = linkMatch[1];
                }
                
                if (pubDateMatch) {
                    pubDate = pubDateMatch[1];
                }
                
                // 只要有標題和連結就加入
                if (title && url) {
                    // 用標題去重,避免同一則新聞重複
                    if (!seenTitles.has(title)) {
                        seenTitles.add(title);
                        
                        let source = 'Google News';
                        if (descMatch) {
                            const sourceMatch = descMatch[1].match(/<a[^>]*>(.*?)<\/a>/);
                            if (sourceMatch) {
                                source = sourceMatch[1];
                            }
                        }
                        
                        allArticles.push({
                            title: title,
                            description: descMatch ? descMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : '',
                            url: url,
                            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
                            source: source,
                            keyword: keyword
                        });
                        newArticles++;
                    }
                } else {
                    // 除錯用:顯示無法解析的 item
                    if (i === 0) {
                        console.log(`        ⚠️  無法解析 item (標題:${!!title}, 連結:${!!url})`);
                    }
                }
            }
            
            searchStats[keyword] = newArticles;
            console.log(`        ✅ 找到 ${items.length} 篇，新增 ${newArticles} 篇`);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            searchStats[keyword] = 0;
            console.error(`        ❌ 搜尋失敗: ${error.message}`);
        }
    }
    
    allArticles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const topArticles = allArticles.slice(0, 15);
    
    console.log(`\n  📊 搜尋統計:`);
    console.log(`     總搜尋關鍵字: ${topic.keywords.length} 個`);
    console.log(`     總找到新聞: ${allArticles.length} 篇`);
    console.log(`     取用最新: ${topArticles.length} 篇`);
    
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
async function analyzeNewsWithClaude(topic, newsArticles, manualData) {
    if (!ANTHROPIC_API_KEY) {
        console.log(`  ⚠️  未設定 ANTHROPIC_API_KEY，無法分析`);
        return null;
    }

    const newsContext = newsArticles.length > 0 
        ? `\n\n最新新聞 (${newsArticles.length} 篇):\n${newsArticles.map((article, i) => 
            `${i + 1}. 【${article.source}】${article.title}\n   ${article.description}`
          ).join('\n\n')}`
        : '\n\n(未找到最新新聞)';
    
    let manualContext = '';
    if (manualData && manualData[topic.id] && manualData[topic.id].length > 0) {
        manualContext = `\n\n手動提供的重要資訊 (${manualData[topic.id].length} 筆):\n${manualData[topic.id].map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
    }

    const prompt = `你是電動車產業觀察專家。請分析「${topic.name}」這個主題的重要趨勢。

搜尋範圍: ${topic.keywords.join('、')}
${newsContext}
${manualContext}

請提供:
1. 摘要 (150字內，整合最新新聞、手動資料和產業趨勢，優先使用真實新聞和手動資料的具體內容)
2. 5個關鍵重點 (每個50字內，必須基於提供的新聞和資料，包含具體案例或數據)
3. 5個延伸討論問題

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
    const manualData = await loadManualDataFromSheets(); // 從 Google Sheets 載入
    const results = {};

    console.log('📋 === 關鍵字設定總覽 ===');
    topics.forEach(topic => {
        console.log(`\n【${topic.name}】 共 ${topic.keywords.length} 個關鍵字:`);
        topic.keywords.slice(0, 5).forEach((kw, i) => {
            console.log(`  ${i + 1}. "${kw}"`);
        });
        if (topic.keywords.length > 5) {
            console.log(`  ... 還有 ${topic.keywords.length - 5} 個關鍵字`);
        }
    });
    console.log('\n=========================\n');

    for (const topic of topics) {
        console.log(`📊 處理主題: ${topic.name}`);
        
        try {
            const newsArticles = await searchNewsWithGoogleRSS(topic);
            const analysis = await analyzeNewsWithClaude(topic, newsArticles, manualData);
            
            if (analysis) {
                results[topic.id] = analysis;
                console.log(`✅ ${topic.name} 完成`);
                console.log(`   📰 新聞: ${newsArticles.length} 篇`);
                console.log(`   📝 重點: ${analysis.keyPoints.length} 個`);
                if (manualData && manualData[topic.id]) {
                    console.log(`   📊 手動資料: ${manualData[topic.id].length} 筆`);
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

    const htmlContent = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,sans-serif;background-color:#f5f5f5;padding:20px 0;">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;background-color:#ffffff;border-radius:12px;">
<tr><td style="background:linear-gradient(135deg,#1a73e8 0%,#4285f4 100%);padding:32px 24px;text-align:center;">
<h1 style="margin:0;font-size:24px;color:#ffffff;">⚡ 電動車生態每日觀察</h1>
<p style="margin:8px 0 0 0;font-size:14px;color:#ffffff;">📅 ${date} | 🔍 Google News + 手動資料</p>
</td></tr>
<tr><td style="padding:24px;">
${['policy', 'tech', 'business', 'ux'].map(key => {
    const icons = { policy: '📋', tech: '🔬', business: '💼', ux: '👥' };
    const titles = { policy: '政策法規', tech: '技術發展', business: '商業模式', ux: '使用者體驗' };
    const topic = digestData[key];
    
    return `<div style="margin-bottom:24px;">
<h2 style="font-size:18px;color:#202124;">${icons[key]} ${titles[key]}</h2>
<div style="background:#f8f9fa;padding:16px;border-radius:8px;margin:12px 0;">
<p style="margin:0;font-size:15px;line-height:1.7;">${topic.summary}</p>
</div>
${topic.keyPoints.map(point => `<p style="margin:6px 0;padding-left:18px;font-size:14px;">• ${point}</p>`).join('')}
</div>`;
}).join('')}
</td></tr>
<tr><td style="padding:24px;text-align:center;background:#f8f9fa;">
<a href="https://${VERCEL_URL}" style="display:inline-block;padding:14px 32px;background-color:#1a73e8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">📖 查看完整報告</a>
</td></tr>
</table>
</body></html>`;

    const mailOptions = {
        from: `"電動車每日觀察" <${GMAIL_USER}>`,
        to: RECIPIENT_EMAIL,
        subject: `⚡ 電動車生態每日觀察 - ${date}`,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('🎉 ✅ Email 發送成功!');
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
    <title>電動車生態每日觀察 - ${date}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Microsoft JhengHei', sans-serif; background: #f8f9fa; color: #2c3e50; line-height: 1.8; padding: 20px; }
        .container { max-width: 900px; margin: 0 auto; }
        header { text-align: center; padding: 40px 20px; background: white; border-radius: 16px; margin-bottom: 30px; }
        h1 { font-size: 2rem; color: #1a73e8; margin-bottom: 12px; }
        .badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 6px 12px; border-radius: 12px; font-size: 0.85rem; margin-top: 8px; }
        .topic-card { background: white; border-radius: 16px; padding: 32px; margin-bottom: 24px; }
        .topic-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #f1f3f4; }
        .topic-icon { font-size: 2rem; }
        .topic-title { font-size: 1.5rem; font-weight: 700; }
        .summary { background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 24px; border-left: 4px solid #1a73e8; }
        .point-item { padding: 12px 0 12px 24px; position: relative; }
        .point-item::before { content: '•'; position: absolute; left: 8px; color: #1a73e8; font-weight: bold; }
        .sources-section { margin-top: 24px; padding-top: 20px; border-top: 2px solid #f1f3f4; }
        .source-link { display: block; margin: 8px 0; padding: 12px 16px; background: #f1f3f4; color: #1a73e8; text-decoration: none; border-radius: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>⚡ 電動車生態每日觀察</h1>
            <p>📅 ${date}</p>
            <span class="badge">🔍 Google News RSS + 手動資料整合</span>
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
            ${topic.keyPoints.map(point => `<div class="point-item">${point}</div>`).join('')}
            
            ${topic.sources && topic.sources.length > 0 ? `
            <div class="sources-section">
                <div style="font-size:0.9rem;font-weight:600;color:#5f6368;margin-bottom:12px;">📰 新聞來源</div>
                ${topic.sources.map(s => `<a href="${s.url}" class="source-link" target="_blank">${s.name}<div style="font-size:0.8rem;color:#5f6368;margin-top:4px;">${s.source} • ${new Date(s.publishedAt).toLocaleDateString('zh-TW')}</div></a>`).join('')}
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
        console.log('=== Google News RSS + Google Sheets ===');
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
