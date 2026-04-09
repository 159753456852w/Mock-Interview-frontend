document.addEventListener('DOMContentLoaded', () => {
    // Randomize Teacher Avatar
    const avatarContainer = document.getElementById('avatar-container');
    if (avatarContainer) {
        const randomIndex = Math.floor(Math.random() * 5) + 1;
        const avatarUrl = `img/avatars/avatar${randomIndex}.png`;
        avatarContainer.innerHTML = `<img src="${avatarUrl}" class="avatar-img" alt="Teacher Avatar">`;
    }

    // DOM Elements
    const questionCards = document.querySelectorAll('.question-card');
    const startBtn = document.getElementById('start-btn');
    const startBtnText = document.getElementById('start-btn-text');
    const messagesList = document.getElementById('messages-list');
    const voiceVisualizer = document.getElementById('voice-visualizer');

    // Panel Elements
    const overallScore = document.getElementById('overall-score');
    const dimSpeed = document.getElementById('dim-speed');
    const dimConfidence = document.getElementById('dim-confidence');
    const dimEmotion = document.getElementById('dim-emotion');
    const adviceBox = document.getElementById('advice-box');

    // Audio Record Variables
    let mediaRecorder = null;
    let audioChunks = [];
    let isRecording = false;
    let isProcessing = false;

    // Web Speech API Variables
    let recognition = null;
    let speechFinalText = '';       // 已確認的最終文字
    let speechInterimText = '';     // 尚未確認的中間文字
    let speechSupported = false;    // 瀏覽器是否支援
    
    // 當前的錄音消息氣泡（用於更新即時文字）
    let currentUserBubble = null;

    // 初始化 Web Speech API
    function setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('此瀏覽器不支援 Web Speech API，即時轉譯功能將不可用');
            return;
        }

        speechSupported = true;
        recognition = new SpeechRecognition();
        recognition.lang = 'zh-TW';
        recognition.continuous = true;          // 持續辨識，不會自動停止
        recognition.interimResults = true;      // 接收中間結果（逐字顯示）
        recognition.maxAlternatives = 1;

        recognition.onresult = (event) => {
            let finalText = '';
            let interimText = '';

            for (let i = 0; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }

            speechFinalText = finalText;
            speechInterimText = interimText;
            updateUserBubbleText(speechFinalText, speechInterimText);
        };

        recognition.onerror = (event) => {
            // no-speech 錯誤可忽略，使用者暫停說話時會觸發
            if (event.error === 'no-speech') return;
            console.warn('SpeechRecognition 錯誤:', event.error);
        };

        // 在 continuous 模式下，若服務端中斷連線會觸發 onend
        // 如果仍在錄音狀態，自動重新啟動辨識
        recognition.onend = () => {
            if (isRecording && speechSupported) {
                try {
                    recognition.start();
                } catch (e) {
                    // 可能在極短時間內重複啟動，忽略此錯誤
                }
            }
        };
    }

    // 更新使用者麥克風文字氣泡（即時轉譯）
    function updateUserBubbleText(finalText, interimText) {
        if (!currentUserBubble) return;
        
        let html = '';
        if (finalText) {
            html += finalText;
        }
        if (interimText) {
            html += `<span class="interim">${interimText}</span>`;
        }
        if (!finalText && !interimText) {
            html = '<span class="interim">正在聆聽...</span>';
        }
        
        // 更新氣泡內容，但保留語音動畫指示器
        const voiceIndicator = currentUserBubble.querySelector('.voice-indicator');
        currentUserBubble.innerHTML = html;
        if (voiceIndicator) {
            currentUserBubble.appendChild(voiceIndicator);
        }
    }

    // 創建消息氣泡 (user or bot)
    function createMessageBubble(text, isUser = true, showVoiceIndicator = false) {
        const messageGroup = document.createElement('div');
        messageGroup.classList.add('message-group');
        messageGroup.classList.add(isUser ? 'user-message' : 'bot-message');

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');
        bubble.classList.add(isUser ? 'user' : 'bot');
        bubble.innerHTML = text;

        if (showVoiceIndicator) {
            const voiceIndicator = document.createElement('div');
            voiceIndicator.classList.add('voice-indicator');
            voiceIndicator.innerHTML = `
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            `;
            bubble.appendChild(voiceIndicator);
        }

        messageGroup.appendChild(bubble);
        messagesList.appendChild(messageGroup);
        
        // 自動滾動到最底部
        messagesList.scrollTop = messagesList.scrollHeight;

        return bubble;
    }

    // 初始化
    setupSpeechRecognition();

    // Request Microphone Permission
    async function setupRecorder() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

            mediaRecorder.ondataavailable = event => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                // 取得即時辨識文字一併送出
                const liveText = getSpeechText();
                await sendAudioToAPI(audioBlob, liveText);
                audioChunks = [];
            };
        } catch (err) {
            console.error("麥克風初始化失敗", err);
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                alert("找不到麥克風裝置。\n\n請確認：\n1. 電腦已連接麥克風（內建或外接）\n2. Windows 設定 > 系統 > 音效 > 輸入裝置 已啟用\n3. Windows 設定 > 隱私權 > 麥克風 > 允許應用程式存取 已開啟");
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                alert("麥克風權限被拒絕。\n\n請點擊瀏覽器網址列左側的鎖頭圖示，將麥克風權限設為「允許」後重新整理頁面。");
            } else {
                alert("麥克風初始化失敗：" + err.message);
            }
        }
    }

    // 取得即時辨識的最終結果（用作備援文字）
    function getSpeechText() {
        return (speechFinalText + speechInterimText).trim();
    }

    // Handle Question Selection using Event Delegation
    const questionList = document.getElementById('question-list');
    if (questionList) {
        questionList.addEventListener('click', (e) => {
            const card = e.target.closest('.question-card');
            if (!card) return;
            if (isProcessing || isRecording) return;
            
            // 樣式切換
            document.querySelectorAll('.question-card').forEach(c => {
                c.classList.remove('active');
                const tag = c.querySelector('.q-tag');
                if (tag) {
                    tag.classList.remove('tag-red');
                    tag.classList.add('tag-gray');
                }
            });

            card.classList.add('active');
            const activeTag = card.querySelector('.q-tag');
            if (activeTag) {
                activeTag.classList.remove('tag-gray');
                activeTag.classList.add('tag-red');
            }

            // 發送事件觸發介面更新
            window.dispatchEvent(new CustomEvent('questionChanged', { detail: card.dataset.q }));
        });
    }

    // 監聽題目切換事件 (來自初始載入或點擊切換)
    window.addEventListener('questionChanged', (e) => {
        const questionTitle = e.detail;
        resetUI(questionTitle);
    });

    function resetUI(questionTitle) {
        // 清空消息列表，改以 AI 面試官直接報題
        const displayQuestion = questionTitle ? `目前題目：<br/><span style="font-size:1.05rem; font-weight:600; color:#1e293b;">${questionTitle}</span><br/><br/>請點擊按鈕開始回答。` : '系統已就緒，請隨時開始模擬';
        
        messagesList.innerHTML = '';
        createMessageBubble(displayQuestion, false, false);
        
        // 重置評分
        overallScore.textContent = "--";
        updateDimStatus(dimSpeed, "待分析", "status-gray");
        updateDimStatus(dimConfidence, "待分析", "status-gray");
        updateDimStatus(dimEmotion, "待分析", "status-gray");
        if (adviceBox) {
            adviceBox.textContent = "尚未有分析建議";
        }
        hideVisualizer();
        
        // 重置錄音狀態
        currentUserBubble = null;
    }

    // Toggle Recording State
    startBtn.addEventListener('click', async () => {
        if (isProcessing) return;

        if (!mediaRecorder) {
            await setupRecorder();
        }

        if (!mediaRecorder) return; // 沒取得權限

        if (!isRecording) {
            // 開始錄音
            isRecording = true;
            audioChunks = [];
            mediaRecorder.start(200); // 每 200ms 產出 chunk

            startBtn.classList.add('recording');
            startBtnText.textContent = "點擊結束錄音並送出";

            showVisualizer(false); // 顯示紅色的使用者聲波

            // 移除系統消息，創建使用者氣泡（帶語音指示器）
            const systemMsg = messagesList.querySelector('.system-message');
            if (systemMsg) systemMsg.remove();
            
            currentUserBubble = createMessageBubble('<span class="interim">正在聆聽...</span>', true, true);

            // 同步啟動即時語音辨識
            speechFinalText = '';
            speechInterimText = '';
            if (speechSupported && recognition) {
                try {
                    recognition.start();
                } catch (e) {
                    console.warn('無法啟動 SpeechRecognition:', e);
                }
            }
        } else {
            // 停止錄音並送出
            isRecording = false;
            mediaRecorder.stop();

            // 停止即時語音辨識
            if (speechSupported && recognition) {
                try {
                    recognition.stop();
                } catch (e) {
                    // 忽略
                }
            }

            startBtn.classList.remove('recording');
            startBtn.disabled = true;
            startBtnText.textContent = "AI 分析中...";

            hideVisualizer();
            isProcessing = true;
        }
    });

    async function sendAudioToAPI(audioBlob, liveText) {
        // 等待 API 配置加載完成
        await window.API_CONFIG.loaded;

        const activeCard = document.querySelector('.question-card.active');
        const question = activeCard ? activeCard.dataset.q : "";
        const reference_answer = activeCard ? activeCard.dataset.ref : "";

        const formData = new FormData();
        formData.append('question', question);
        formData.append('reference_answer', reference_answer);
        formData.append('audio', audioBlob, 'record.webm');

        // 將即時辨識的文字一併送出，作為 Whisper 的備援
        if (liveText) {
            formData.append('user_answer', liveText);
        }

        try {
            const apiUrl = `${window.API_CONFIG.baseUrl}/api/chat`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.status === 'success') {
                const data = result.data;

                // 更新用戶消息氣泡顯示最終文字（移除語音指示器）
                if (currentUserBubble) {
                    currentUserBubble.innerHTML = data.parsed_text || "（無內容）";
                }
                currentUserBubble = null;

                // 更新分數與維度
                overallScore.textContent = data.score;
                updateDimStatus(dimSpeed, data.dimensions.speed, getStatusColor(data.dimensions.speed));
                updateDimStatus(dimConfidence, data.dimensions.confidence, getStatusColor(data.dimensions.confidence));
                updateDimStatus(dimEmotion, data.dimensions.emotion, getStatusColor(data.dimensions.emotion));
                if (adviceBox) {
                    adviceBox.textContent = data.advice || "無建議";
                }

                // 更新歷史紀錄次數
                updateHistoryCount();

                // 添加 AI 回覆消息氣泡（帶語音指示器）
                createMessageBubble(data.reply || "無法生成回覆", false, true);

                // 播放 AI 語音
                if (data.ai_audio_url) {
                    playAIAudio(data.ai_audio_url);
                } else {
                    finishProcessing();
                }

            } else {
                // 錯誤消息
                createMessageBubble("⚠️ 分析失敗，請重試", false, false);
                finishProcessing();
            }
        } catch (error) {
            console.error("API Error:", error);
            createMessageBubble("⚠️ 無法連接伺服器，請確認後端已啟動", false, false);
            finishProcessing();
        }
    }

    function playAIAudio(audioUrl) {
        // 設定 AI 語音播放波紋狀態
        showVisualizer(true);

        // 如果 audioUrl 是相對路徑，加上基礎 URL
        let fullAudioUrl = audioUrl;
        if (!audioUrl.startsWith('http://') && !audioUrl.startsWith('https://')) {
            fullAudioUrl = window.API_CONFIG.baseUrl + audioUrl;
        }

        fetch(fullAudioUrl, {
            headers: { 'ngrok-skip-browser-warning': 'true' }
        })
        .then(res => res.blob())
        .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const audio = new Audio(blobUrl);
            audio.play().catch(err => {
                console.error("Audio play failed:", err);
                finishProcessing();
            });
            audio.onended = () => {
                finishProcessing();
                URL.revokeObjectURL(blobUrl);
            };
        })
        .catch(err => {
            console.error("Fetch audio failed:", err);
            finishProcessing();
        });
    }

    function finishProcessing() {
        hideVisualizer();
        isProcessing = false;
        startBtn.disabled = false;
        startBtnText.textContent = "點擊開始錄音";
        // 確保移除 AI 說話專用色
        voiceVisualizer.classList.remove('is-ai');
    }

    // Helpers
    function showVisualizer(isAI) {
        voiceVisualizer.classList.remove('hidden');
        if (isAI) {
            voiceVisualizer.classList.add('is-ai');
        } else {
            voiceVisualizer.classList.remove('is-ai');
        }
    }

    function hideVisualizer() {
        voiceVisualizer.classList.add('hidden');
        voiceVisualizer.classList.remove('is-ai');
    }

    function updateDimStatus(elem, text, colorClass) {
        elem.textContent = text;
        elem.className = `dim-status ${colorClass}`;
    }

    function getStatusColor(statusText) {
        if (statusText.includes("良好") || statusText.includes("優秀") || statusText.includes("佳")) {
            return "status-green";
        } else if (statusText.includes("待加強") || statusText.includes("待補") || statusText.includes("弱")) {
            return "status-red";
        }
        return "status-gray"; // Default fallback
    }

    // === Report Modal Logic ===
    const historyBtn = document.getElementById('history-btn');
    const reportModal = document.getElementById('report-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const reportRecordsBody = document.getElementById('report-records-body');
    const generateAdviceBtn = document.getElementById('generate-advice-btn');
    const aiAggregateAdvice = document.getElementById('ai-aggregate-advice');
    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    const reportDate = document.getElementById('report-date');

    // Update history button text
    async function updateHistoryCount() {
        if (!historyBtn) return;
        try {
            const apiUrl = `${window.API_CONFIG.baseUrl}/api/records`;
            const response = await fetch(apiUrl);
            const result = await response.json();
            if (result.status === 'success') {
                historyBtn.innerHTML = `甄選診斷紀錄 (${result.data.length})`;
            }
        } catch (e) {
            console.error("Fetch records error:", e);
        }
    }

    // Call it initially
    setTimeout(updateHistoryCount, 500);

    if (historyBtn && reportModal) {
        historyBtn.addEventListener('click', async () => {
            reportModal.classList.remove('hidden');
            reportDate.textContent = `列印時間：${new Date().toLocaleString('zh-TW', { hour12: false })}`;
            
            // 載入歷史紀錄
            reportRecordsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">載入中...</td></tr>';
            aiAggregateAdvice.innerHTML = '<p class="empty-state" style="color:#94a3b8; text-align:center;">點擊上方按鈕，AI 將為您的所有面試紀錄進行綜合分析。</p>';
            generateAdviceBtn.disabled = false;
            generateAdviceBtn.textContent = '產生總結分析';
            
            try {
                const apiUrl = `${window.API_CONFIG.baseUrl}/api/records`;
                const response = await fetch(apiUrl);
                const result = await response.json();
                if (result.status === 'success') {
                    const records = result.data;
                    historyBtn.innerHTML = `甄選診斷紀錄 (${records.length})`;
                    
                    if (records.length === 0) {
                        reportRecordsBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">目前沒有任何診斷紀錄</td></tr>';
                    } else {
                        reportRecordsBody.innerHTML = '';
                        records.forEach((r, idx) => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${idx + 1}</td>
                                <td>${r.question}</td>
                                <td style="font-weight:bold; color:var(--primary-red);">${r.score}</td>
                                <td>${r.speed} / ${r.confidence} / ${r.emotion}</td>
                                <td style="white-space:pre-wrap; font-size:13px; color:var(--text-secondary);">${r.advice}</td>
                            `;
                            reportRecordsBody.appendChild(tr);
                        });
                    }
                }
            } catch (e) {
                console.error(e);
                reportRecordsBody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">載入紀錄失敗，請檢查網路狀態</td></tr>';
            }
        });

        closeModalBtn.addEventListener('click', () => {
            reportModal.classList.add('hidden');
        });

        generateAdviceBtn.addEventListener('click', async () => {
            generateAdviceBtn.disabled = true;
            generateAdviceBtn.textContent = '生成中...';
            aiAggregateAdvice.innerHTML = '<div style="text-align:center; color:#64748b;">AI 正在分析您的歷史表現，請稍候...</div>';

            try {
                const apiUrl = `${window.API_CONFIG.baseUrl}/api/report_advice`;
                const response = await fetch(apiUrl, { method: 'POST' });
                const result = await response.json();
                if (result.status === 'success') {
                    aiAggregateAdvice.innerHTML = result.advice;
                } else {
                    throw new Error("API returned error");
                }
            } catch (e) {
                console.error(e);
                aiAggregateAdvice.innerHTML = '<div style="color:red; text-align:center;">生成分析失敗，請檢查網路連線或稍後重試。</div>';
                generateAdviceBtn.disabled = false;
                generateAdviceBtn.textContent = '重新產生';
            }
        });

        downloadPdfBtn.addEventListener('click', () => {
            const element = document.getElementById('pdf-target');
            const opt = {
                margin:       10,
                filename:     '模擬面試綜合報表.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            downloadPdfBtn.disabled = true;
            downloadPdfBtn.innerHTML = '<i data-lucide="loader"></i> 處理中...';
            if (window.lucide) lucide.createIcons();

            html2pdf().set(opt).from(element).save().then(() => {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.innerHTML = '<i data-lucide="download"></i> 下載 PDF';
                if (window.lucide) lucide.createIcons();
            });
        });
    }
});
