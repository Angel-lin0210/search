const fs = require('fs');
const path = require('path');

const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

// 測試用的模擬資料
function getMockDigestData() {
    return {
        "policy": {
            "summary": "台灣政府宣布擴大電動車購車補助,同時放寬社區管委會設置充電樁的相關法規限制,預計2026年底前完成全台公寓大廈充電設施設置指引修訂。",
            "keyPoints": [
                "經濟部宣布電動車購車補助延長至2027年,最高補助金額提升至8萬元",
                "內政部修正公寓大廈管理條例施行細則,簡化充電樁設置申請程序",
                "台電推出社區專案,協助管委會評估電力系統升級需求",
                "環保署公布新版電動車碳足跡計算標準,納入充電來源碳排",
                "六都陸續公告充電專用停車位設置比例,新建案須達10%以上"
            ],
            "questions": [
                "購車補助延長是否會影響二手電動車市場價格穩定性?",
                "簡化申請程序後,舊公寓大廈的電力系統是否足以負荷多戶充電需求?",
                "如何平衡管委會決策效率與住戶充電權益保障?",
                "碳足跡標準改變是否會影響企業採購電動車的意願?",
                "充電專用車位比例提高,對現有停車空間不足的社區影響為何?"
            ],
            "sources": [
                {"title": "經濟部電動車補助方案", "url": "https://www.moea.gov.tw"},
                {"title": "內政部公寓大廈管理修正案", "url": "https://www.moi.gov.tw"}
            ]
        },
        "tech": {
            "summary": "快充技術突破800kW功率門檻,充電5分鐘可行駛400公里。同時智慧EMS系統開始整合AI預測,可根據電價波動自動調整充電策略,平均節省30%充電成本。",
            "keyPoints": [
                "中國寧德時代發表第二代神行超充電池,支援6C充電倍率",
                "特斯拉V4超充樁開始在歐洲部署,最高功率達350kW",
                "台達電推出雙向充電樁,支援Vehicle-to-Grid (V2G) 功能",
                "EMS系統整合OpenAI技術,可預測用戶行為優化充電時段",
                "固態電池商業化時程提前,豐田宣布2027年量產計畫"
            ],
            "questions": [
                "超高功率快充對電池壽命的長期影響需要多久才能驗證?",
                "V2G技術普及後,電網穩定性管理需要哪些配套措施?",
                "AI優化充電策略是否會因為過度依賴演算法而產生新的風險?",
                "固態電池成本下降速度能否跟上市場期待?",
                "充電技術標準碎片化問題如何解決?"
            ],
            "sources": [
                {"title": "寧德時代技術發表", "url": "https://www.catl.com"},
                {"title": "台達電V2G方案", "url": "https://www.delta.com.tw"}
            ]
        },
        "business": {
            "summary": "充電營運商開始推出訂閱制服務,月費299元無限充電模式在都會區獲得好評。同時停車場業者與充電樁廠商合作,推出「停車+充電」整合方案,改變傳統營運模式。",
            "keyPoints": [
                "Gogoro Network宣布跨入四輪電動車充電市場,利用現有換電站網路",
                "中油與全家便利商店合作,在全台500個據點設置快充站",
                "裕隆集團推出「充電即服務」(CaaS) 平台,整合多家充電營運商",
                "停車大樓改裝充電設施投資回收期縮短至3年",
                "社區型慢充共享平台興起,鄰居間可互相分享充電樁"
            ],
            "questions": [
                "訂閱制無限充電模式是否會造成尖峰時段壅塞問題?",
                "傳統加油站轉型充電站的最大障礙是什麼?",
                "充電平台整合後,用戶資料隱私如何保護?",
                "社區型共享充電的法律責任歸屬如何界定?",
                "充電基礎建設投資熱潮是否有泡沫化風險?"
            ],
            "sources": [
                {"title": "Gogoro擴展計畫", "url": "https://www.gogoro.com"},
                {"title": "中油充電網路", "url": "https://www.cpc.com.tw"}
            ]
        },
        "ux": {
            "summary": "用戶最大痛點仍是「充電樁被油車佔用」,雖然各縣市開始執法取締,但成效有限。另外充電App介面複雜、需下載多個App的問題持續困擾車主。",
            "keyPoints": [
                "調查顯示68%電動車主曾遇到充電車位被佔用情況",
                "台北市開始使用AI辨識系統,自動開單取締佔用充電格的油車",
                "充電App整合平台「一卡通充」上線,支援15家業者",
                "冬季低溫導致充電速度下降30%,引發用戶抱怨",
                "公共充電樁故障率仍高達12%,影響用戶信心"
            ],
            "questions": [
                "如何從根本解決充電車位被佔用問題?單靠罰款是否足夠?",
                "充電App整合後,各家業者利益如何平衡?",
                "低溫影響充電效率的問題,有哪些技術解決方案?",
                "充電樁維護責任應該由誰承擔?營運商還是場地方?",
                "如何提升充電基礎設施的可靠度到接近加油站的水準?"
            ],
            "sources": [
                {"title": "電動車主滿意度調查", "url": "https://www.artc.org.tw"},
                {"title": "台北市智慧執法系統", "url": "https://www.gov.taipei"}
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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="test-banner">⚠️ 這是測試版本 - 使用模擬資料</div>
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

        html += `</div>`;
    });

    html += `
            <div class="footer">
                此為測試郵件,使用模擬資料 | 系統每日早上 6:00 執行
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
        console.log('=== 開始執行測試版每日搜集 ===');
        console.log('📝 使用模擬資料進行測試');
        console.log('Email:', RECIPIENT_EMAIL);
        
        const digestData = getMockDigestData();
        console.log('✅ 已生成測試資料');
        
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
