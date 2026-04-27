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
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>⚡ 電動車生態每日觀察</h1>
            <p class="date">📅 ${date}</p>
        </header>
        
        <div class="topic-card">
            <div class="topic-header">
                <span class="topic-icon">📋</span>
                <h2 class="topic-title">政策法規</h2>
            </div>
            <div class="summary">${data.policy.summary}</div>
            <h3 class="points-title">關鍵重點</h3>
            ${data.policy.keyPoints.map(point => `<div class="point-item">${point}</div>`).join('')}
        </div>
        
        <div class="topic-card">
            <div class="topic-header">
                <span class="topic-icon">🔬</span>
                <h2 class="topic-title">技術發展</h2>
            </div>
            <div class="summary">${data.tech.summary}</div>
            <h3 class="points-title">關鍵重點</h3>
            ${data.tech.keyPoints.map(point => `<div class="point-item">${point}</div>`).join('')}
        </div>
        
        <div class="topic-card">
            <div class="topic-header">
                <span class="topic-icon">💼</span>
                <h2 class="topic-title">商業模式</h2>
            </div>
            <div class="summary">${data.business.summary}</div>
            <h3 class="points-title">關鍵重點</h3>
            ${data.business.keyPoints.map(point => `<div class="point-item">${point}</div>`).join('')}
        </div>
        
        <div class="topic-card">
            <div class="topic-header">
                <span class="topic-icon">👥</span>
                <h2 class="topic-title">使用者體驗</h2>
            </div>
            <div class="summary">${data.ux.summary}</div>
            <h3 class="points-title">關鍵重點</h3>
            ${data.ux.keyPoints.map(point => `<div class="point-item">${point}</div>`).join('')}
        </div>
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
