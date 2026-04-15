const { createApp, ref, computed, onMounted, nextTick } = Vue;

createApp({
    setup() {
        const step = ref('start');
        const questions = ref([]);
        const charactersData = ref({});
        const currentIndex = ref(0);
        const answers = ref([]);
        
        const finalResultCode = ref('');
        const matchedCharacter = ref({});
        const isNeutral = ref(false);
        const isSubmitting = ref(false);
        const isSubmitted = ref(false);
        const submitMessage = ref('');

        const options = [
            { label: "非常符合", value: 2 }, { label: "比较符合", value: 1 },
            { label: "中立", value: 0 }, { label: "不太符合", value: -1 }, { label: "非常不符合", value: -2 }
        ];

        // 页面加载时，异步拉取 JSON 数据
        onMounted(async () => {
            try {
                // 读取题库
                const qRes = await fetch('./data/questions.json');
                const qData = await qRes.json();
                questions.value = seededShuffle(qData);
                
                // 读取角色库
                const cRes = await fetch('./data/characters.json');
                charactersData.value = await cRes.json();
            } catch (error) {
                console.error("加载数据失败，请在服务器环境下运行:", error);
            }
        });

        const currentQuestion = computed(() => questions.value[currentIndex.value]);
        const submitBtnText = computed(() => {
            if (isSubmitting.value) return '上传数据中...';
            if (isSubmitted.value) return '已入档！';
            return '提交并保存我的结果';
        });

        const startTest = () => { step.value = 'testing'; };

        const selectOption = (value) => {
            answers.value[currentIndex.value] = { ...currentQuestion.value, score: value };
            if (currentIndex.value < questions.value.length - 1) {
                currentIndex.value++;
            } else {
                calculateResult();
            }
        };

        const prevQuestion = () => { if (currentIndex.value > 0) currentIndex.value--; };

        const calculateResult = () => {
            let dimScores = { BD: 0, AC: 0, UI: 0, HE: 0, RT: 0, WP: 0 };
            answers.value.forEach(ans => {
                if (ans.dim !== 'OTHER') dimScores[ans.dim] += ans.score * ans.pole;
            });

            let resultCode = "";
            let zeroCount = 0;
            // 判断逻辑 (0分规则保留)
            if (dimScores.BD > 0) resultCode += "B"; else if (dimScores.BD < 0) resultCode += "D"; else { resultCode += "D"; zeroCount++; }
            if (dimScores.AC > 0) resultCode += "A"; else if (dimScores.AC < 0) resultCode += "C"; else { resultCode += "C"; zeroCount++; }
            if (dimScores.UI > 0) resultCode += "U"; else if (dimScores.UI < 0) resultCode += "I"; else { resultCode += "I"; zeroCount++; }
            if (dimScores.HE > 0) resultCode += "H"; else if (dimScores.HE < 0) resultCode += "E"; else { resultCode += "E"; zeroCount++; }
            if (dimScores.RT > 0) resultCode += "R"; else if (dimScores.RT < 0) resultCode += "T"; else { resultCode += "T"; zeroCount++; }
            if (dimScores.WP > 0) resultCode += "W"; else if (dimScores.WP < 0) resultCode += "P"; else { resultCode += "P"; zeroCount++; }

            finalResultCode.value = resultCode;
            isNeutral.value = zeroCount >= 4;

            // ===== 核心：O(1) 查字典直接匹配 64 种情况 =====
            if (isNeutral.value) {
                matchedCharacter.value = charactersData.value["NEUTRAL"];
            } else {
                // 尝试从 64 个组合中直接读取，如果没写这个组合，就读取 DEFAULT 防崩
                matchedCharacter.value = charactersData.value[resultCode] || charactersData.value["DEFAULT"];
            }

            step.value = 'result';
            nextTick(() => { drawRadarChart(dimScores); });
        };

        // 随机种子打乱函数
        const seededShuffle = (array, seed = 114514) => {
            let m = array.length, t, i;
            while (m) {
                seed = (seed * 9301 + 49297) % 233280;
                i = Math.floor((seed / 233280) * m--);
                t = array[m]; array[m] = array[i]; array[i] = t;
            }
            return array;
        };

        const drawRadarChart = (scores) => { /* 这里保留上一版雷达图的绘制逻辑代码 */ };

        const submitData = async () => {
            isSubmitting.value = true;
            const payload = { result: finalResultCode.value, character: matchedCharacter.value.name, isNeutral: isNeutral.value ? 'true' : 'false', submitTime: new Date().toISOString() };
            // 【注意：替换为你的阿里云函数地址】
            const WEBHOOK_URL = "https://savesurvey-wdzwrthfoe.cn-hangzhou.fcapp.run";
            try {
                const response = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                if (response.ok) { submitMessage.value = "数据已成功入档！"; isSubmitted.value = true; } 
                else submitMessage.value = "保存失败";
            } catch (error) { submitMessage.value = "网络错误"; } 
            finally { isSubmitting.value = false; }
        };

        return { step, questions, currentIndex, currentQuestion, options, finalResultCode, isNeutral, matchedCharacter, startTest, selectOption, prevQuestion, submitData, isSubmitting, isSubmitted, submitMessage, submitBtnText };
    }
}).mount('#app');