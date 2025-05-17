const API_KEY = 'AIzaSyDL12z-qYxT4uAv2v2hwjMHUe8iXcK0ETU';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

let conversationHistory = [];

// 初始化語音識別
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let r = null;
let iR = false;

if (SpeechRecognition) {
    r = new SpeechRecognition();
    r.continuous = false;
    r.lang = 'zh-TW';
    
    r.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('userInput').value = transcript;
        stopRecording();
    };
    
    r.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        stopRecording();
    };
    
    r.onend = () => {
        stopRecording();
    };
} else {
    console.log('Speech recognition not supported');
}

function toggleSpeechRecognition() {
    if (!recognition) {
        alert('您的瀏覽器尚不支援語音識別功能');
        return;
    }
    
    if (!isRecording) {
        startRecording();
    } else {
        stopRecording();
    }
}

function startRecording() {
    iR = true;
    const micButton = document.getElementById('micButton');
    micButton.classList.add('recording');
    recognition.start();
}

function stopRecording() {
    iR = false;
    const micButton = document.getElementById('micButton');
    micButton.classList.remove('recording');
    if (recognition) {
        recognition.stop();
    }
}

// 初始化角色資料
let characterData = null;

// 模式選擇 UI
function setupModeSelector() {
    // 創建文件輸入
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.id = 'characterFile';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    
    const importButton = document.createElement('button');
    importButton.textContent = '導入角色卡';
    importButton.onclick = () => fileInput.click();
    
    fileInput.onchange = handleFileSelect;
    
    document.body.insertBefore(importButton, document.body.firstChild);
    document.body.insertBefore(fileInput, importButton);
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // First try to parse as JSON
            characterData = JSON.parse(e.target.result);
        } catch (error) {
            // If JSON parsing fails, try to parse as plain text
            try {
                // Assume text file contains one property per line in "key: value" format
                const lines = e.target.result.split('\n');
                characterData = {};
                lines.forEach(line => {
                    const [key, value] = line.split(':').map(str => str.trim());
                    if (key && value) {
                        characterData[key] = value;
                    }
                });
            } catch (error) {
                alert('檔案格式錯誤！請確保是有效的JSON或TXT檔案');
                return;
            }
        }
        alert('角色卡導入成功！');
        addMessageToDisplay('【角色卡已導入】\n' + JSON.stringify(characterData, null, 2), false);
    };
    reader.readAsText(file);
}

async function callGoogleAI(userInput) {
    try {
        let prompt = `你是一個安科文的寫作小助手。
${characterData ? `當前角色資料：${JSON.stringify(characterData)}` : ''}

玩家輸入：${userInput}

請提供：
1. 富有想像力的場景描述
2. 當使用者提出"安價"時，提供3-4個具體的選項，並平均分配到1~9的數字，最後新增一個特殊項為大成功/失敗，使用D2判定，共為10項，並**直接**在1~10範圍中隨機一個數字產出結果，並依照這個數字產生相對應選項的發展。
3. 當使用者提出"D100"時請在1~100範圍中隨機一個數字，如未說明，通常是愈大效果愈好，並依照這個數字產生相對應選項的發展。
4. 如果有角色資料，將其融入劇情中

保持簡潔有力的敘事風格，適當分段以提高可讀性。`;

        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            throw new Error('API 請求失敗');
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error('Error:', error);
        return '發生錯誤，請稍後再試。';
    }
}

function addMessageToDisplay(text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    messageDiv.textContent = text;

    const container = document.getElementById('storyContainer');
    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;

    conversationHistory.push({
        role: isUser ? 'user' : 'ai',
        text: text
    });
}

async function sendMessage() {
    const inputElement = document.getElementById('userInput');
    const userInput = inputElement.value.trim();

    if (userInput === '') return;

    addMessageToDisplay(userInput, true);
    inputElement.value = '';
    inputElement.disabled = true;

    const aiResponse = await callGoogleAI(userInput);
    addMessageToDisplay(aiResponse, false);

    inputElement.disabled = false;
    inputElement.focus();
}

function handleKeyPress(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// 初始化
window.addEventListener('DOMContentLoaded', setupModeSelector);
