const fs = require('fs');
const path = require('path');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const RECIPIENT_EMAIL = process.env.RECIPIENT_EMAIL;
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

async function fetchDailyDigest() {
    console.log('開始搜集每日資訊...');
    
    if (!ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY 未設定');
    }

    try {
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 4000,
                system: `你是專業的電動車產業分析師。請搜集最新的台灣及國際電動車相關資訊,包含:
                - 電動車產業動態
                - 管委會與充電設施相關法規
                - EMS 能源管理系統
                - 充電樁基礎建設
                - 電價政策

                請按照以下四個面向分類整理:
                1. 政策法規變化
                2. 技術發展趨勢
                3. 商業模式創新
                4. 使用者體驗問題

                針對每個面向,提供:
                - 簡潔摘要(100字內)
                - 3-5個關鍵重點
                - 3-5個可延伸討論的深度問題

                **請以純 JSON 格式回應,不要包含任何其他文字或 Markdown 標記**,格式如下:
                {
                  "policy": {
                    "summary": "...",
                    "keyPoints": ["...", "..."],
                    "questions": ["...", "..."],
                    "sources": [{"title": "...", "url": "..."}]
                  },
                  "tech": {...},
                  "business": {...},
                  "ux": {...}
                }`,
                messages: [
                    { 
                        role: "user", 
                        content: `請搜尋並整理今天(${new Date().toLocaleDateString('zh-TW')})關於電動車、管委會、EMS、充電樁、電價的最新資訊。` 
                    }
                ],
                tools: [
                    {
                        "type": "web_search_20250305",
                        "name": "web_search"
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API 請求失敗: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('收到 API 回應');

        if (!data.content || !Array.isArray(data.content)) {
            console.error('API 回應格式異常:', JSON.stringify(data, null, 2));
            throw new Error('API 回應格式不正確');
        }

        const textContent = data.content
            .filter(item => item.type === 'text')
            .map(item => item.text)
            .join('\n');
        
        if (!textContent) {
            throw new Error('API 回應中沒有文字內容');
        }

        const cleanJson = textContent
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
        
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error('搜集資訊失敗:', error);
        throw error;
    }
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
        subject: `電動車生態每日觀察 - ${new Date().toLocaleDateString('zh-TW')}`,
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
                此郵件由自動化系統生成 | 每日早上 6:00 執行
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

    const filepath = path.join(dir, `${date}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`已儲存至: ${filepath}`);
}

async function main() {
    try {
        console.log('=== 開始執行每日搜集 ===');
        console.log('API Key 已設定:', !!ANTHROPIC_API_KEY);
        console.log('Email:', RECIPIENT_EMAIL);
        
        const digestData = await fetchDailyDigest();
        await saveToFile(digestData);
        await sendEmail(digestData);
        
        console.log('=== 每日搜集完成! ===');
    } catch (error) {
        console.error('=== 執行失敗 ===');
        console.error('錯誤詳情:', error.message);
        console.error('完整錯誤:', error);
        process.exit(1);
    }
}

main();
