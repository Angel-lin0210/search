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
        console.log('   GMAIL_USER:', GMAIL_USER ? '已設定' : '未設定');
        console.log('   GMAIL_APP_PASSWORD:', GMAIL_APP_PASSWORD ? '已設定' : '未設定');
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
    textContent += `📋 政策法規\n${digestData.policy.summary}\n\n`;
    textContent += `🔬 技術發展\n${digestData.tech.summary}\n\n`;
    textContent += `💼 商業模式\n${digestData.business.summary}\n\n`;
    textContent += `👥 使用者體驗\n${digestData.ux.summary}\n\n`;
    textContent += `完整報告: https://${VERCEL_URL}`;

    // 組合 HTML 版本
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Microsoft JhengHei', 'Noto Sans TC', sans-serif;
            background: #f5f5f5;
            padding: 20px;
            margin: 0;
        }
        .container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 1.8rem;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .topic {
            margin-bottom: 30px;
            padding-bottom: 30px;
            border-bottom: 1px solid #eee;
        }
        .topic:last-child {
            border-bottom: none;
        }
        .topic-title {
            font-size: 1.3rem;
            color: #333;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .topic-icon {
            font-size: 1.5rem;
        }
        .summary {
            color: #555;
            line-height: 1.7;
            margin-bottom: 15px;
        }
        .points {
            margin-top: 12px;
        }
        .point {
            color: #666;
            line-height: 1.6;
            padding: 6px 0 6px 20px;
            position: relative;
        }
        .point::before {
            content: '•';
            position: absolute;
            left: 6px;
            color: #667eea;
            font-weight: bold;
        }
        .cta-button {
            display: block;
            width: fit-content;
            margin: 30px auto;
            padding: 14px 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            text-align: center;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #999;
            font-size: 0.9rem;
            background: #f9f9f9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ 電動車生態每日觀察</h1>
            <p>📅 ${date}</p>
        </div>
        
        <div class="content">
            <div class="topic">
                <div class="topic-title">
                    <span class="topic-icon">📋</span>
                    政策法規
                </div>
                <div class="summary">${digestData.policy.summary}</div>
                <div class="points">
                    ${digestData.policy.keyPoints.map(point => `<div class="point">${point}</div>`).join('')}
                </div>
            </div>
            
            <div class="topic">
                <div class="topic-title">
                    <span class="topic-icon">🔬</span>
                    技術發展
                </div>
                <div class="summary">${digestData.tech.summary}</div>
                <div class="points">
                    ${digestData.tech.keyPoints.map(point => `<div class="point">${point}</div>`).join('')}
                </div>
            </div>
            
            <div class="topic">
                <div class="topic-title">
                    <span class="topic-icon">💼</span>
                    商業模式
                </div>
                <div class="summary">${digestData.business.summary}</div>
                <div class="points">
                    ${digestData.business.keyPoints.map(point => `<div class="point">${point}</div>`).join('')}
                </div>
            </div>
            
            <div class="topic">
                <div class="topic-title">
                    <span class="topic-icon">👥</span>
                    使用者體驗
                </div>
                <div class="summary">${digestData.ux.summary}</div>
                <div class="points">
                    ${digestData.ux.keyPoints.map(point => `<div class="point">${point}</div>`).join('')}
                </div>
            </div>
            
            <a href="https://${VERCEL_URL}" class="cta-button">
                📖 查看完整報告
            </a>
        </div>
        
        <div class="footer">
            系統每日早上 6:00 自動執行<br>
            電動車生態智能觀察系統
        </div>
    </div>
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
        console.log('   錯誤類型:', error.name);
        console.log('   錯誤訊息:', error.message);
        if (error.code) {
            console.log('   錯誤代碼:', error.code);
        }
        console.log('');
        console.log('完整錯誤資訊:');
        console.error(error);
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
            font-family: 'Noto Sans TC', sans-serif;
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
