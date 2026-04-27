const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const LINE_NOTIFY_TOKEN = process.env.LINE_NOTIFY_TOKEN;
const VERCEL_URL = 'search-evdailydigest.vercel.app';

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

async function sendLineNotify(digestData) {
    if (!LINE_NOTIFY_TOKEN) {
        console.log('未設定 LINE_NOTIFY_TOKEN，跳過發送 LINE 通知');
        return;
    }

    const date = new Date().toLocaleDateString('zh-TW');
    
    let message = `\n⚡ 電動車生態每日觀察\n`;
    message += `📅 ${date}\n\n`;
    
    if (digestData.policy && digestData.policy.keyPoints) {
        message += `📋 政策法規\n• ${digestData.policy.keyPoints[0]}\n\n`;
    }
    
    if (digestData.tech && digestData.tech.keyPoints) {
        message += `🔬 技術發展\n• ${digestData.tech.keyPoints[0]}\n\n`;
    }
    
    if (digestData.business && digestData.business.keyPoints) {
        message += `💼 商業模式\n• ${digestData.business.keyPoints[0]}\n\n`;
    }
    
    if (digestData.ux && digestData.ux.keyPoints) {
        message += `👥 使用者體驗\n• ${digestData.ux.keyPoints[0]}\n\n`;
    }
    
    message += `👉 完整報告: https://${VERCEL_URL}`;

    try {
        const response = await fetch('https://notify-api.line.me/api/notify', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `message=${encodeURIComponent(message)}`
        });

        if (response.ok) {
            console.log('✅ LINE 通知發送成功');
        } else {
            const errorText = await response.text();
            console.error('❌ LINE 通知發送失敗:', errorText);
        }
    } catch (error) {
        console.error('❌ LINE 通知發送錯誤:', error);
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
        console.log('=== 開始執行每日搜集 ===');
        console.log('📝 使用測試資料');
        
        const digestData = getMockDigestData();
        console.log('✅ 已生成資料');
        
        await saveToFile(digestData);
        await generateHTMLReport(digestData);
        await sendLineNotify(digestData);
        
        console.log('=== 每日搜集完成! ===');
    } catch (error) {
        console.error('=== 執行失敗 ===');
        console.error('錯誤:', error);
        process.exit(1);
    }
}

main();
