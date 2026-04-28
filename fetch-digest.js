const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL || process.env.GMAIL_USER;
const VERCEL_URL = 'search-six-rose.vercel.app';

console.log('=== 環境變數檢查 ===');
console.log('GMAIL_USER:', GMAIL_USER ? '已設定 ✅' : '未設定 ❌');
console.log('GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '已設定 ✅' : '未設定 ❌');
console.log('RECIPIENT_EMAIL:', RECIPIENT_EMAIL);
console.log('VERCEL_URL:', VERCEL_URL);

// 測試用的模擬資料
function getMockDigestData() {
    return {
        "policy": {
            "summary": "台灣政府宣布擴大電動車購車補助,同時放寬社區管委會設置充電樁的相關法規限制。",
            "keyPoints": [
                "經濟部宣布電動車購車補助延長至2027年,最高補助金額提升至8萬元",
                "內政部修正公寓大廈管理條例施行細則,簡化充電樁設置申請程序",
                "PTT Car 板網友計算:新政策下 Model 3 實際購車成本可降至 140 萬"
            ]
        },
        "tech": {
            "summary": "快充技術突破800kW功率門檻,Tesla 車主在 Facebook 社團分享 V4 超充實測。",
            "keyPoints": [
                "中國寧德時代發表第二代神行超充電池",
                "特斯拉車主 Facebook 社團分享 V4 超充樁實測數據",
                "YouTube 頻道「電動生活」實測台達電雙向充電樁"
            ]
        },
        "business": {
            "summary": "充電營運商推出訂閱制無限充電,在 Dcard 和 Instagram 引發討論。",
            "keyPoints": [
                "Gogoro Network 宣布跨入四輪電動車充電",
                "「充電即服務」平台在 PTT 引發討論",
                "Threads 上出現多位用戶分享使用心得"
            ]
        },
        "ux": {
            "summary": "「充電樁被油車佔用」持續是社群最熱議題。",
            "keyPoints": [
                "Twitter/X 上 #充電樁被佔 累計超過 5000 則貼文",
                "Mobile01 網友發起「充電樁佔用回報地圖」專案",
                "Instagram 分享台北市 AI 辨識取締系統"
            ]
        }
    };
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

    // 組合文字版本
    let textContent = `電動車生態每日觀察\n`;
    textContent += `${date}\n\n`;
    textContent += `完整報告: https://${VERCEL_URL}\n\n`;
    textContent += `📋 政策法規\n${digestData.policy.summary}\n\n`;
    textContent += `🔬 技術發展\n${digestData.tech.summary}\n\n`;
    textContent += `💼 商業模式\n${digestData.business.summary}\n\n`;
    textContent += `👥 使用者體驗\n${digestData.ux.summary}\n\n`;

    // HTML 版本 - 白色簡潔風格,確保連結可點擊
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft JhengHei','Noto Sans TC',sans-serif;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
<tr><td style="background:linear-gradient(135deg,#1a73e8 0%,#4285f4 100%);padding:32px 24px;text-align:center;">
<h1 style="margin:0 0 8px 0;font-size:24px;font-weight:700;color:#ffffff;">⚡ 電動車生態每日觀察</h1>
<p style="margin:0;font-size:14px;color:#ffffff;opacity:0.95;">📅 ${date}</p>
</td></tr>
<tr><td style="padding:24px;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
<tr><td style="padding:0 0 16px 0;border-bottom:1px solid #e8eaed;">
<h2 style="margin:0;font-size:18px;font-weight:700;color:#202124;">📋 政策法規</h2>
</td></tr>
<tr><td style="padding:14px 0;">
<div style="background:#f8f9fa;padding:16px;border-radius:8px;border-left:3px solid #1a73e8;margin-bottom:12px;">
<p style="margin:0;font-size:15px;color:#3c4043;line-height:1.7;">${digestData.policy.summary}</p>
</div>
<p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#5f6368;text-transform:uppercase;">關鍵重點</p>
${digestData.policy.keyPoints.map(point => `<p style="margin:6px 0;padding-left:18px;position:relative;font-size:14px;color:#3c4043;line-height:1.6;"><span style="position:absolute;left:4px;color:#1a73e8;font-weight:bold;">•</span>${point}</p>`).join('')}
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
<tr><td style="padding:0 0 16px 0;border-bottom:1px solid #e8eaed;">
<h2 style="margin:0;font-size:18px;font-weight:700;color:#202124;">🔬 技術發展</h2>
</td></tr>
<tr><td style="padding:14px 0;">
<div style="background:#f8f9fa;padding:16px;border-radius:8px;border-left:3px solid #1a73e8;margin-bottom:12px;">
<p style="margin:0;font-size:15px;color:#3c4043;line-height:1.7;">${digestData.tech.summary}</p>
</div>
<p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#5f6368;text-transform:uppercase;">關鍵重點</p>
${digestData.tech.keyPoints.map(point => `<p style="margin:6px 0;padding-left:18px;position:relative;font-size:14px;color:#3c4043;line-height:1.6;"><span style="position:absolute;left:4px;color:#1a73e8;font-weight:bold;">•</span>${point}</p>`).join('')}
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
<tr><td style="padding:0 0 16px 0;border-bottom:1px solid #e8eaed;">
<h2 style="margin:0;font-size:18px;font-weight:700;color:#202124;">💼 商業模式</h2>
</td></tr>
<tr><td style="padding:14px 0;">
<div style="background:#f8f9fa;padding:16px;border-radius:8px;border-left:3px solid #1a73e8;margin-bottom:12px;">
<p style="margin:0;font-size:15px;color:#3c4043;line-height:1.7;">${digestData.business.summary}</p>
</div>
<p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#5f6368;text-transform:uppercase;">關鍵重點</p>
${digestData.business.keyPoints.map(point => `<p style="margin:6px 0;padding-left:18px;position:relative;font-size:14px;color:#3c4043;line-height:1.6;"><span style="position:absolute;left:4px;color:#1a73e8;font-weight:bold;">•</span>${point}</p>`).join('')}
</td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:0 0 16px 0;border-bottom:1px solid #e8eaed;">
<h2 style="margin:0;font-size:18px;font-weight:700;color:#202124;">👥 使用者體驗</h2>
</td></tr>
<tr><td style="padding:14px 0;">
<div style="background:#f8f9fa;padding:16px;border-radius:8px;border-left:3px solid #1a73e8;margin-bottom:12px;">
<p style="margin:0;font-size:15px;color:#3c4043;line-height:1.7;">${digestData.ux.summary}</p>
</div>
<p style="margin:0 0 8px 0;font-size:13px;font-weight:600;color:#5f6368;text-transform:uppercase;">關鍵重點</p>
${digestData.ux.keyPoints.map(point => `<p style="margin:6px 0;padding-left:18px;position:relative;font-size:14px;color:#3c4043;line-height:1.6;"><span style="position:absolute;left:4px;color:#1a73e8;font-weight:bold;">•</span>${point}</p>`).join('')}
</td></tr>
</table>
</td></tr>
<tr><td style="padding:24px;background:#f8f9fa;text-align:center;">
<a href="https://${VERCEL_URL}" style="display:inline-block;padding:14px 32px;background-color:#1a73e8;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">📖 查看完整報告與延伸討論</a>
</td></tr>
<tr><td style="padding:20px;text-align:center;color:#80868b;font-size:13px;background:#f8f9fa;border-top:1px solid #e8eaed;">
<p style="margin:4px 0;">系統每日早上 6:00 自動執行</p>
<p style="margin:4px 0;">電動車生態智能觀察系統</p>
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

    console.log('📤 準備發送郵件...');
    console.log('   寄件者:', GMAIL_USER);
    console.log('   收件者:', RECIPIENT_EMAIL);
    console.log('   主旨:', mailOptions.subject);
    
    try {
        console.log('⏳ 發送中...');
        const info = await transporter.sendMail(mailOptions);
        console.log('');
        console.log('🎉 ✅ Email 通知發送成功!');
        console.log('   Message ID:', info.messageId);
        console.log('   Response:', info.response);
        console.log('');
    } catch (error) {
        console.log('');
        console.log('❌ Email 發送失敗');
        console.log('   錯誤訊息:', error.message);
        console.log('');
    }
}

async function saveToFile(data) {
    const date = new Date().toISOString().split('T')[0];
    const dir = path.join(__dirname, 'digests');
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, `${date}-test.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ 已儲存至: ${filepath}`);
}

async function generateHTMLReport(data) {
    const date = new Date().toLocaleDateString('zh-TW');
    
    // 加入延伸問題和資料來源
    const extendedData = {
        policy: {
            ...data.policy,
            questions: [
                "購車補助延長是否會影響二手電動車市場價格穩定性?",
                "網友分享的管委會溝通技巧,哪些最有效?",
                "如何平衡管委會決策效率與住戶充電權益保障?",
                "社群上反對充電樁的主要論點有哪些?如何回應?",
                "充電專用車位比例提高,對現有停車空間不足的社區影響為何?"
            ],
            sources: [
                { name: "經濟部電動車補助方案", url: "https://www.moea.gov.tw" },
                { name: "PTT Car 板補助討論串", url: "https://www.ptt.cc/bbs/car" }
            ]
        },
        tech: {
            ...data.tech,
            questions: [
                "超高功率快充對電池壽命的長期影響,車主實測數據如何?",
                "社群上分享的 V2G 實際使用案例有哪些?節省多少電費?",
                "網友對 AI 優化充電的疑慮(隱私、演算法透明度)如何解決?",
                "YouTube 實測影片中未揭露的充電技術細節有哪些?",
                "固態電池討論熱度這麼高,一般消費者該如何判斷購車時機?"
            ],
            sources: [
                { name: "Tesla 車主社團實測文", url: "https://www.facebook.com/groups/tesla" },
                { name: "電動生活 YouTube 頻道", url: "https://www.youtube.com" }
            ]
        },
        business: {
            ...data.business,
            questions: [
                "訂閱制無限充電的用戶滿意度調查,社群反饋如何?",
                "網紅推薦的充電服務是否有業配嫌疑?如何辨別?",
                "社群上抱怨充電樁故障的案例,共同問題是什麼?",
                "「停車+充電」方案的實際使用者,推薦度和痛點各是什麼?",
                "充電平台整合後,用戶在社群上最常討論的使用問題?"
            ],
            sources: [
                { name: "Gogoro IG 官方貼文", url: "https://www.instagram.com/gogoro" },
                { name: "PTT Tech_Job 板討論", url: "https://www.ptt.cc/bbs/tech_job" }
            ]
        },
        ux: {
            ...data.ux,
            questions: [
                "社群上分享的「防止充電樁被佔」妙招,哪些真的有效?",
                "充電 App 整合平台推出後,YouTuber 和使用者評價落差為何?",
                "網友自製的「充電樁佔用地圖」,是否能推動官方改善?",
                "社群熱議的「冬季充電慢」問題,各車廠回應了嗎?",
                "Facebook 社團的故障樁回報機制,對提升維護效率有幫助嗎?"
            ],
            sources: [
                { name: "Mobile01 充電地圖專案", url: "https://www.mobile01.com" },
                { name: "電動車主互助會 FB 社團", url: "https://www.facebook.com/groups/evowners" }
            ]
        }
    };
    
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
            font-size: 16px;
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
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .question-item {
            background: white;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            display: flex;
            gap: 12px;
            align-items: flex-start;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .question-item:last-child { margin-bottom: 0; }
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
            flex-shrink: 0;
        }
        .question-text {
            flex: 1;
            color: #3c4043;
            line-height: 1.6;
            padding-top: 2px;
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
            display: inline-block;
            margin: 6px 8px 6px 0;
            padding: 8px 16px;
            background: #f1f3f4;
            color: #1a73e8;
            text-decoration: none;
            border-radius: 20px;
            font-size: 0.9rem;
            transition: all 0.2s;
        }
        .source-link:hover {
            background: #e8f0fe;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>⚡ 電動車生態每日觀察</h1>
            <p class="date">📅 ${date}</p>
        </header>
        
        ${['policy', 'tech', 'business', 'ux'].map(key => {
            const icons = { policy: '📋', tech: '🔬', business: '💼', ux: '👥' };
            const titles = { policy: '政策法規', tech: '技術發展', business: '商業模式', ux: '使用者體驗' };
            const topic = extendedData[key];
            
            return `<div class="topic-card">
            <div class="topic-header">
                <span class="topic-icon">${icons[key]}</span>
                <h2 class="topic-title">${titles[key]}</h2>
            </div>
            <div class="summary">${topic.summary}</div>
            <h3 class="points-title">關鍵重點</h3>
            ${topic.keyPoints.map(point => `<div class="point-item">${point}</div>`).join('')}
            
            <div class="questions-section">
                <h3 class="questions-title">💡 延伸討論</h3>
                ${topic.questions.map((q, i) => `
                <div class="question-item">
                    <div class="question-number">${i + 1}</div>
                    <div class="question-text">${q}</div>
                </div>`).join('')}
            </div>
            
            <div class="sources-section">
                <div class="sources-title">📚 資料來源</div>
                ${topic.sources.map(s => `<a href="${s.url}" class="source-link" target="_blank">${s.name}</a>`).join('')}
            </div>
        </div>`;
        }).join('')}
    </div>
</body>
</html>`;

    const htmlPath = path.join(__dirname, 'index.html');
    fs.writeFileSync(htmlPath, html, 'utf-8');
    console.log('✅ 已生成完整 HTML 報告(含延伸問題和資料來源)');
}

async function main() {
    try {
        console.log('');
        console.log('=== 開始執行每日搜集 ===');
        console.log('📝 使用測試資料');
        console.log('');
        
        const digestData = getMockDigestData();
        console.log('✅ 已生成資料');
        
        await saveToFile(digestData);
        await generateHTMLReport(digestData);
        await sendEmailNotification(digestData);
        
        console.log('=== 每日搜集完成! ===');
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
