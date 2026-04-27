const fs = require('fs');
const path = require('path');

const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// 測試用的模擬資料
function getMockDigestData() {
    return {
        "policy": {
            "summary": "台灣政府宣布擴大電動車購車補助,同時放寬社區管委會設置充電樁的相關法規限制。網友在 PTT 和 Mobile01 熱烈討論,多數認為補助延長是好事,但也擔心舊公寓電力系統能否負荷。",
            "keyPoints": [
                "經濟部宣布電動車購車補助延長至2027年,最高補助金額提升至8萬元",
                "內政部修正公寓大廈管理條例施行細則,簡化充電樁設置申請程序",
                "PTT Car 板網友計算:新政策下 Model 3 實際購車成本可降至 140 萬",
                "Mobile01 討論區出現多篇「管委會充電樁安裝經驗分享」,點閱破萬",
                "Dcard 有住戶分享成功說服管委會同意設置的完整流程"
            ],
            "questions": [
                "購車補助延長是否會影響二手電動車市場價格穩定性?",
                "網友分享的管委會溝通技巧,哪些最有效?",
                "如何平衡管委會決策效率與住戶充電權益保障?",
                "社群上反對充電樁的主要論點有哪些?如何回應?",
                "充電專用車位比例提高,對現有停車空間不足的社區影響為何?"
            ],
            "sources": [
                {"title": "經濟部電動車補助方案", "url": "https://www.moea.gov.tw"},
                {"title": "PTT Car 板補助討論串", "url": "https://www.ptt.cc/bbs/car"}
            ]
        },
        "tech": {
            "summary": "快充技術突破800kW功率門檻,Tesla 車主在 Facebook 社團分享 V4 超充實測,5 分鐘充到 60%。YouTube 汽車頻道「電動生活」實測影片觀看數破 50 萬,網友熱議充電速度已接近加油體驗。",
            "keyPoints": [
                "中國寧德時代發表第二代神行超充電池,技術細節在知乎引發熱議",
                "特斯拉車主 Facebook 社團分享 V4 超充樁實測數據,充電曲線完整記錄",
                "YouTube 頻道「電動生活」實測台達電雙向充電樁,留言區討論 V2G 應用場景",
                "Mobile01 網友分析:固態電池若 2027 量產,現在買電動車是否太早?",
                "Twitter/X 上日本工程師分享 AI 優化充電演算法開源專案,獲 2000+ 星標"
            ],
            "questions": [
                "超高功率快充對電池壽命的長期影響,車主實測數據如何?",
                "社群上分享的 V2G 實際使用案例有哪些?節省多少電費?",
                "網友對 AI 優化充電的疑慮(隱私、演算法透明度)如何解決?",
                "YouTube 實測影片中未揭露的充電技術細節有哪些?",
                "固態電池討論熱度這麼高,一般消費者該如何判斷購車時機?"
            ],
            "sources": [
                {"title": "Tesla 車主社團實測文", "url": "https://www.facebook.com/groups/tesla"},
                {"title": "電動生活 YouTube 頻道", "url": "https://www.youtube.com"}
            ]
        },
        "business": {
            "summary": "充電營運商推出訂閱制無限充電,在 Dcard 和 Instagram 引發討論。網紅「電動邦」開箱體驗影片點閱破百萬,但留言區有用戶反映尖峰時段等待時間過長問題。",
            "keyPoints": [
                "Gogoro Network 宣布跨入四輪電動車充電,Instagram 貼文互動數創紀錄",
                "「充電即服務」平台在 PTT Tech_Job 板引發討論:商業模式是否可持續?",
                "Threads 上出現多位用戶分享「停車+充電」整合方案使用心得",
                "Facebook 電動車社團管理員整理「全台充電站評比」,按讚數破萬",
                "Dcard 有網友爆料某充電站故障率高,業者緊急回應說明改善措施"
            ],
            "questions": [
                "訂閱制無限充電的用戶滿意度調查,社群反饋如何?",
                "網紅推薦的充電服務是否有業配嫌疑?如何辨別?",
                "社群上抱怨充電樁故障的案例,共同問題是什麼?",
                "「停車+充電」方案的實際使用者,推薦度和痛點各是什麼?",
                "充電平台整合後,用戶在社群上最常討論的使用問題?"
            ],
            "sources": [
                {"title": "Gogoro IG 官方貼文", "url": "https://www.instagram.com/gogoro"},
                {"title": "PTT Tech_Job 板討論", "url": "https://www.ptt.cc/bbs/tech_job"}
            ]
        },
        "ux": {
            "summary": "「充電樁被油車佔用」持續是社群最熱議題,Instagram 限時動態和 Threads 每天都有車主抱怨。YouTuber「開箱哥」實測充電 App 整合平台,指出介面混亂、需下載多個 App 的問題,影片獲 10 萬次觀看。",
            "keyPoints": [
                "Twitter/X 上 #充電樁被佔 hashtag 累計超過 5000 則貼文,多為抱怨文",
                "Mobile01 網友發起「充電樁佔用回報地圖」專案,已標記 300+ 個熱點",
                "Instagram 汽車帳號「電動車日常」分享台北市 AI 辨識取締系統,按讚破 5 萬",
                "Facebook 社團「電動車主互助會」每週整理充電樁故障清單,成員互相提醒",
                "Dcard 出現「冬季充電速度實測」文章,網友分享各品牌車款數據對比"
            ],
            "questions": [
                "社群上分享的「防止充電樁被佔」妙招,哪些真的有效?",
                "充電 App 整合平台推出後,YouTuber 和使用者評價落差為何?",
                "網友自製的「充電樁佔用地圖」,是否能推動官方改善?",
                "社群熱議的「冬季充電慢」問題,各車廠回應了嗎?",
                "Facebook 社團的故障樁回報機制,對提升維護效率有幫助嗎?"
            ],
            "sources": [
                {"title": "Mobile01 充電地圖專案", "url": "https://www.mobile01.com"},
                {"title": "電動車主互助會 FB 社團", "url": "https://www.facebook.com/groups/evowners"}
            ]
        }
    };
}

async function sendEmail(digestData) {
    if (!SENDGRID_API_KEY) {
        console.log('未設定 SendGrid API Key，跳過發送 Email');
        return;
    }

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(SENDGRID_API_KEY);

    const htmlContent = generateEmailHTML(digestData);

    const msg = {
        to: RECIPIENT_EMAIL,
        from: RECIPIENT_EMAIL,
        subject: `[測試] 電動車生態每日觀察 - ${new Date().toLocaleDateString('zh-TW')}`,
        html: htmlContent
    };

    try {
        await sgMail.send(msg);
        console.log('Email 發送成功');
    } catch (error) {
        console.error('Email 發送失敗:', error);
    }
}

function generateEmailHTML(data) {
    const topics = {
        policy: { icon: '📋', name: '政策法規' },
        tech: { icon: '🔬', name: '技術發展' },
        business: { icon: '💼', name: '商業模式' },
        ux: { icon: '👥', name: '使用者體驗' }
    };

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: 'Microsoft JhengHei', sans-serif; background: #f5f5f5; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; }
            .test-banner { background: #fff3cd; border: 2px solid #ffc107; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center; color: #856404; font-weight: bold; }
            h1 { color: #00d9ff; border-bottom: 3px solid #00d9ff; padding-bottom: 15px; }
            .topic { margin: 30px 0; padding: 20px; background: #f9f9f9; border-radius: 8px; }
            .topic-title { font-size: 1.3rem; font-weight: bold; margin-bottom: 15px; color: #333; }
            .summary { color: #666; line-height: 1.8; margin-bottom: 20px; }
            .key-points { margin: 15px 0; }
            .key-points li { margin: 8px 0; color: #555; }
            .questions { background: #e8f4ff; padding: 15px; border-radius: 6px; margin-top: 15px; }
            .questions h4 { color: #0066cc; margin-bottom: 10px; }
            .questions li { margin: 8px 0; color: #333; font-weight: 500; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 0.9rem; }
            .sources { margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd; }
            .sources h5 { font-size: 0.9rem; color: #888; margin-bottom: 8px; }
            .sources a { display: inline-block; margin: 5px 10px 5px 0; padding: 4px 10px; background: #e8f4ff; border-radius: 4px; color: #0066cc; text-decoration: none; font-size: 0.85rem; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="test-banner">⚠️ 這是測試版本 - 使用模擬資料 (含社群討論範例)</div>
            <h1>⚡ 電動車生態每日觀察</h1>
            <p style="color: #999;">更新時間: ${new Date().toLocaleString('zh-TW')}</p>
    `;

    Object.keys(topics).forEach(key => {
        const topic = topics[key];
        const topicData = data[key];
        
        if (!topicData) return;

        html += `
            <div class="topic">
                <div class="topic-title">${topic.icon} ${topic.name}</div>
                <div class="summary">${topicData.summary || '暫無資料'}</div>
        `;

        if (topicData.keyPoints && topicData.keyPoints.length > 0) {
            html += `
                <div class="key-points">
                    <strong>關鍵重點:</strong>
                    <ul>
                        ${topicData.keyPoints.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        if (topicData.questions && topicData.questions.length > 0) {
            html += `
                <div class="questions">
                    <h4>💡 延伸討論</h4>
                    <ol>
                        ${topicData.questions.map(q => `<li>${q}</li>`).join('')}
                    </ol>
                </div>
            `;
        }

        if (topicData.sources && topicData.sources.length > 0) {
            html += `
                <div class="sources">
                    <h5>📌 資料來源</h5>
                    ${topicData.sources.map(s => `<a href="${s.url}" target="_blank">${s.title}</a>`).join('')}
                </div>
            `;
        }

        html += `</div>`;
    });

    html += `
            <div class="footer">
                此為測試郵件,包含社群媒體討論範例 | 系統每日早上 6:00 執行
            </div>
        </div>
    </body>
    </html>
    `;

    return html;
}

async function saveToFile(data) {
    const date = new Date().toISOString().split('T')[0];
    const dir = path.join(__dirname, 'digests');
    
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const filepath = path.join(dir, `${date}-test.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`已儲存至: ${filepath}`);
}

async function main() {
    try {
        console.log('=== 開始執行測試版每日搜集 (含社群討論) ===');
        console.log('📝 使用模擬資料進行測試');
        console.log('📱 已包含社群媒體討論範例');
        console.log('Email:', RECIPIENT_EMAIL);
        
        const digestData = getMockDigestData();
        console.log('✅ 已生成測試資料(含社群討論)');
        
        await saveToFile(digestData);
        console.log('✅ 已儲存檔案');
        
        await sendEmail(digestData);
        console.log('✅ Email 處理完成');
        
        console.log('=== 測試版每日搜集完成! ===');
        console.log('💡 等 Anthropic 充值完成後,可切換回正式版本');
    } catch (error) {
        console.error('=== 執行失敗 ===');
        console.error('錯誤詳情:', error.message);
        console.error('完整錯誤:', error);
        process.exit(1);
    }
}

main();
