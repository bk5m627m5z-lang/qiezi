/* ============================================================
 *  神秘命运占卜 - 主逻辑脚本
 *  按功能模块分组，使用 JSDoc 风格注释
 * ============================================================ */

// ==================== 1. 全局状态 ====================

/**
 * 用户数据对象 —— 贯穿整个占卜流程的核心状态
 * @property {string}   name        - 用户输入的姓名
 * @property {string}   zodiac      - 选择的星座名称
 * @property {string}   zodiacEmoji - 星座对应 emoji
 * @property {string[]} answers     - 4道性格测试的答案（A/B/C/D）
 * @property {object|null} tarotCard - 选中的塔罗牌信息 { name, emoji, type }
 * @property {string|null} rune     - 选中的符文字符
 */
let userData = {
    name: '',
    zodiac: '',
    zodiacEmoji: '',
    answers: [],
    tarotCard: null,
    rune: null
};

// 当前性格测试题的选中答案（临时变量，提交后清空并推入 userData.answers）
let currentSelection = null;

// ==================== 2. 初始化 ====================

/** 生成 100 颗随机位置、大小、闪烁延迟的星星 */
function createStars() {
    var starsContainer = document.getElementById('stars');
    for (var i = 0; i < 100; i++) {
        var star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = Math.random() * 2 + 's';
        star.style.width = Math.random() * 3 + 1 + 'px';
        star.style.height = star.style.width;
        starsContainer.appendChild(star);
    }
}

/**
 * 监听第10页（结果页）的 active 状态变化
 * 当结果页显示时自动触发最终结果计算
 */
var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.target.id === 'page10' && mutation.target.classList.contains('active')) {
            showFinalResult();
        }
    });
});
observer.observe(document.getElementById('page10'), { attributes: true, attributeFilter: ['class'] });

// 注入抖动动画 CSS（动态添加，避免硬编码在样式表中）
var shakeStyle = document.createElement('style');
shakeStyle.textContent =
    '@keyframes shake {' +
    '0%, 100% { transform: translateX(0); }' +
    '25% { transform: translateX(-10px); }' +
    '75% { transform: translateX(10px); }' +
    '}';
document.head.appendChild(shakeStyle);

// 页面加载完毕后创建星空
createStars();

// ==================== 3. 页面导航 ====================

/**
 * 切换到指定页面
 * 通过 CSS class .active 控制显示/隐藏，实现 SPA 效果
 * @param {number} pageNum - 目标页码 (1-10)
 */
function goToPage(pageNum) {
    // 移除所有页面的 active 状态
    document.querySelectorAll('.page').forEach(function(p) {
        p.classList.remove('active');
    });
    // 激活目标页面
    document.getElementById('page' + pageNum).classList.add('active');
    window.scrollTo(0, 0);
}

// ==================== 4. 用户输入处理 ====================

/** 保存姓名并跳转到星座选择页 */
function saveName() {
    var name = document.getElementById('userName').value.trim();
    if (!name) {
        shakeElement(document.getElementById('userName'));
        return;
    }
    userData.name = name;
    goToPage(3);
}

/**
 * 选择星座（视觉高亮 + 存储数据）
 * @param {HTMLElement} element - 被点击的星座卡片
 * @param {string} name - 星座中文名
 * @param {string} emoji - 星座 emoji
 */
function selectZodiac(element, name, emoji) {
    // 移除之前的高亮
    document.querySelectorAll('.zodiac-item').forEach(function(el) {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    userData.zodiac = name;
    userData.zodiacEmoji = emoji;
}

/** 确认星座选择，校验后跳转到答题 */
function confirmZodiac() {
    if (!userData.zodiac) {
        alert('请先选择一个星座！');
        return;
    }
    goToPage(4);
}

// ==================== 5. 答题流程 ====================

/**
 * 单选题选项点击
 * @param {HTMLElement} element - 被点击的选项卡片
 * @param {string} value - 选项值 (A/B/C/D)
 */
function selectOption(element, value) {
    // 同一页面内单选：清除同级所有选中，再选中当前
    element.parentElement.querySelectorAll('.option-card').forEach(function(el) {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    currentSelection = value;
}

/**
 * 记录答案并跳转到下一题
 * @param {number} nextPage - 下一页的页码
 */
function nextQuestion(nextPage) {
    if (!currentSelection) {
        alert('请选择一个选项！');
        return;
    }
    userData.answers.push(currentSelection);
    currentSelection = null;
    goToPage(nextPage);
}

/** 完成最后一题，显示加载动画后跳转到塔罗牌页 */
function finishPersonality() {
    if (!currentSelection) {
        alert('请选择一个选项！');
        return;
    }
    userData.answers.push(currentSelection);
    currentSelection = null;

    showLoading('正在解析你的命运密码...', 2000, function() {
        goToPage(8);
    });
}

// ==================== 6. 塔罗牌 ====================

/**
 * 翻开塔罗牌
 * 只能选一张，选中后其他牌变暗
 * @param {HTMLElement} element - 被点击的牌
 * @param {string} name - 牌名
 * @param {string} emoji - 牌面 emoji
 * @param {string} type - 运势类型
 */
function flipCard(element, name, emoji, type) {
    if (element.classList.contains('flipped')) return;  // 已翻开的不再响应

    // 其他牌变暗
    document.querySelectorAll('.tarot-card').forEach(function(card) {
        if (card !== element) card.style.opacity = '0.3';
    });

    element.classList.add('flipped');
    userData.tarotCard = { name: name, emoji: emoji, type: type };

    document.getElementById('tarotHint').textContent = '你抽到了【' + name + '】牌！';
    document.getElementById('tarotBtn').style.display = 'inline-block';
}

// ==================== 7. 符文选择 ====================

/**
 * 选择守护符文，显示对应含义
 * @param {HTMLElement} element - 被点击的符文
 * @param {string} rune - 符文字符
 */
function selectRune(element, rune) {
    document.querySelectorAll('.rune').forEach(function(el) {
        el.classList.remove('selected');
    });
    element.classList.add('selected');
    userData.rune = rune;

    // 符文含义对照表
    var meanings = {
        'ᚠ': { title: '费胡符文 (Feihu)', desc: '代表财富与繁荣。预示着即将到来的丰收期，你的努力将获得丰厚回报。保持积极的心态，财运正在向你靠近。' },
        'ᚢ': { title: '乌鲁兹符文 (Uruz)', desc: '代表力量与坚韧。象征着你内在强大的生命力，无论遇到什么困难，你都有能力克服。这是突破自我的最佳时机。' },
        'ᚦ': { title: '苏力萨兹符文 (Thurisaz)', desc: '代表保护与挑战。暗示前方有考验等待着你，但这也是成长的契机。相信直觉，它会指引你避开危险。' },
        'ᚨ': { title: '安苏兹符文 (Ansuz)', desc: '代表智慧与沟通。预示着你将获得重要的启示或建议。保持开放的心态，倾听周围的声音，答案就在其中。' },
        'ᚱ': { title: '莱多符文 (Raido)', desc: '代表旅程与变化。象征着人生新阶段的开始，无论是实际的旅行还是心灵的探索，都将带来意想不到的收获。' }
    };

    var meaning = meanings[rune];
    document.getElementById('runeTitle').textContent = meaning.title;
    document.getElementById('runeDesc').textContent = meaning.desc;
    document.getElementById('runeMeaning').style.display = 'block';
}

// ==================== 8. 结果计算 ====================

/**
 * 根据 4 道题的答案统计性格类型
 * 规则：统计 A/B/C/D 出现次数，取最多的那个
 * @returns {{title: string, desc: string}} 性格标题和描述
 */
function calculatePersonality() {
    var counts = { A: 0, B: 0, C: 0, D: 0 };
    userData.answers.forEach(function(a) { counts[a]++; });

    // 找出出现次数最多的选项
    var max = Math.max.apply(null, Object.values(counts));
    var type = Object.keys(counts).find(function(k) { return counts[k] === max; });

    var personalities = {
        A: {
            title: '🔮 神秘预言者',
            desc: '你拥有敏锐的直觉和洞察力，能够感知常人无法察觉的能量波动。你适合从事需要深度思考的工作，在安静的环境中你能发挥出最大的潜能。你的神秘气质吸引着身边的人，但要注意不要过于沉浸在自己的世界中。'
        },
        B: {
            title: '✨ 星辰操控者',
            desc: '你天生具有领导魅力和强大的意志力，像星辰一样散发着独特的光芒。你善于规划和执行，能够将梦想变为现实。你的自信和果断是你最大的武器，但也要学会倾听他人的意见。'
        },
        C: {
            title: '🌌 维度探索者',
            desc: '你充满好奇心和冒险精神，渴望探索未知的领域。你适应力强，能够在各种环境中找到乐趣。你的创造力和想象力是无穷的宝藏，建议你多尝试艺术创作或科技创新，那里有你的一片天地。'
        },
        D: {
            title: '💜 心灵感知者',
            desc: '你拥有极高的情商和同理心，能够深刻理解他人的情感。你是天生的倾听者和治愈者，朋友们都愿意向你倾诉。你的温柔和善良是你的超能力，但要注意保护自己的情绪边界，不要让他人的负能量影响到你。'
        }
    };

    return personalities[type];
}

/**
 * 生成四项运势分数
 * 基础分 60 + 星座加成 + 随机波动(0-19)，上限 98
 * @returns {{love: number, career: number, wealth: number, health: number}}
 */
function generateFortune() {
    var base = { love: 60, career: 60, wealth: 60, health: 60 };

    // 星座对运势的加权影响
    var zodiacBonus = {
        '白羊座': { career: 15, love: 5 },
        '金牛座': { wealth: 20, health: 5 },
        '双子座': { love: 15, career: 5 },
        '巨蟹座': { health: 15, love: 10 },
        '狮子座': { career: 20, wealth: 5 },
        '处女座': { health: 20, career: 5 },
        '天秤座': { love: 20, career: 5 },
        '天蝎座': { wealth: 15, love: 10 },
        '射手座': { career: 10, wealth: 15 },
        '摩羯座': { career: 20, health: 5 },
        '水瓶座': { wealth: 15, health: 10 },
        '双鱼座': { love: 20, wealth: 5 }
    };

    var bonus = zodiacBonus[userData.zodiac] || {};
    return {
        love: Math.min(98, base.love + (bonus.love || 0) + Math.floor(Math.random() * 20)),
        career: Math.min(98, base.career + (bonus.career || 0) + Math.floor(Math.random() * 20)),
        wealth: Math.min(98, base.wealth + (bonus.wealth || 0) + Math.floor(Math.random() * 20)),
        health: Math.min(98, base.health + (bonus.health || 0) + Math.floor(Math.random() * 20))
    };
}

/**
 * 根据用户选择的塔罗牌生成解读文案
 * @returns {{title: string, content: string}}
 */
function generateTarotResult() {
    var card = userData.tarotCard;
    var results = {
        '恋人': '爱情运势极佳！近期可能会遇到命中注定的那个人，或者现有的感情将更加甜蜜。保持开放的心态，真爱就在不远处。',
        '星辰': '事业将迎来转机！你的才华终于被看见，可能会有升职或重要项目的机会。坚持你的理想，成功指日可待。',
        '月亮': '财运亨通！可能会有一笔意外之财，或者投资获得回报。但也要注意理性消费，不要被表面的诱惑迷惑。',
        '太阳': '健康状况良好！你的精力充沛，适合开始新的运动计划或调整作息。保持乐观的心态，身体会给你最好的回报。',
        '命运之轮': '综合运势上升！生活中的各个方面都在向好的方向发展。抓住眼前的机会，命运正在眷顾着你。'
    };
    return {
        title: card.emoji + ' ' + card.name + '牌解读',
        content: results[card.name]
    };
}

/** 汇总所有数据并渲染到第10页 */
function showFinalResult() {
    var personality = calculatePersonality();
    var fortune = generateFortune();
    var tarot = generateTarotResult();

    // 符文解读文案
    var runeMeanings = {
        'ᚠ': '财富符文守护着你，近期财运旺盛。',
        'ᚢ': '力量符文加持着你，你将克服一切困难。',
        'ᚦ': '保护符文笼罩着你，化险为夷。',
        'ᚨ': '智慧符文启迪着你，灵感源源不断。',
        'ᚱ': '旅程符文引导着你，新的冒险即将开始。'
    };

    // 填写用户基本信息
    document.getElementById('resultSubtitle').textContent =
        userData.zodiacEmoji + ' ' + userData.name + ' · ' + userData.zodiac;

    // 性格结果
    document.getElementById('personalityTitle').textContent = personality.title;
    document.getElementById('personalityContent').textContent = personality.desc;

    // 运势分数
    document.getElementById('loveScore').textContent = fortune.love + '%';
    document.getElementById('careerScore').textContent = fortune.career + '%';
    document.getElementById('wealthScore').textContent = fortune.wealth + '%';
    document.getElementById('healthScore').textContent = fortune.health + '%';

    // 运势条动画（延迟 500ms 触发填满效果）
    setTimeout(function() {
        document.getElementById('loveBar').style.width = fortune.love + '%';
        document.getElementById('careerBar').style.width = fortune.career + '%';
        document.getElementById('wealthBar').style.width = fortune.wealth + '%';
        document.getElementById('healthBar').style.width = fortune.health + '%';
    }, 500);

    // 塔罗牌结果
    document.getElementById('tarotTitle').textContent = tarot.title;
    document.getElementById('tarotResult').textContent = tarot.content;

    // 符文结果
    document.getElementById('runeResultTitle').textContent = 'ᛟ 守护符文：' + userData.rune;
    document.getElementById('runeResult').textContent = runeMeanings[userData.rune] || '神秘符文守护着你。';

    // 幸运信息（随机生成）
    var luckyNum = Math.floor(Math.random() * 99) + 1;
    var luckyColors = ['深紫色', '午夜蓝', '星空银', '薰衣草紫', '神秘黑'];
    var luckyColor = luckyColors[Math.floor(Math.random() * luckyColors.length)];
    var directions = ['东南', '西北', '正南', '东北', '西南'];
    var luckyDirection = directions[Math.floor(Math.random() * directions.length)];

    // 星级根据爱情运分数换算（满分 5 星）
    document.getElementById('luckyStars').textContent = '⭐'.repeat(Math.floor(fortune.love / 20));
    document.getElementById('luckyInfo').innerHTML =
        '<p>🎲 幸运数字：<strong style="color:#d8b4fe">' + luckyNum + '</strong></p>' +
        '<p>🎨 幸运颜色：<strong style="color:#d8b4fe">' + luckyColor + '</strong></p>' +
        '<p>📅 幸运方位：<strong style="color:#d8b4fe">' + luckyDirection + '</strong></p>';
}

// ==================== 9. 分享 & 重置 ====================

/** 分享运势结果（优先使用 Web Share API，回退到剪贴板复制） */
function shareResult() {
    var personality = calculatePersonality();
    var text = '🔮 我刚刚完成了神秘命运占卜！\n' +
        '我是【' + personality.title + '】\n' +
        '星座：' + userData.zodiac + '\n' +
        '快来测测你的命运吧！';

    // 移动端优先使用原生分享
    if (navigator.share) {
        navigator.share({ title: '神秘命运占卜', text: text });
    } else {
        // 桌面端回退：复制到剪贴板
        var textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('运势结果已复制到剪贴板！快去分享给朋友吧~');
    }
}

/** 重置所有状态，回到首页 */
function restart() {
    // 重置全局数据
    userData = { name: '', zodiac: '', zodiacEmoji: '', answers: [], tarotCard: null, rune: null };

    // 清除所有 UI 选中状态
    document.querySelectorAll('.selected').forEach(function(el) { el.classList.remove('selected'); });
    document.querySelectorAll('.flipped').forEach(function(el) { el.classList.remove('flipped'); });
    document.querySelectorAll('.tarot-card').forEach(function(card) { card.style.opacity = '1'; });

    // 重置输入框和提示文字
    document.getElementById('userName').value = '';
    document.getElementById('tarotHint').textContent = '点击任意一张牌揭开命运';
    document.getElementById('tarotBtn').style.display = 'none';
    document.getElementById('runeMeaning').style.display = 'none';

    // 重置运势条为 0
    ['loveBar', 'careerBar', 'wealthBar', 'healthBar'].forEach(function(id) {
        document.getElementById(id).style.width = '0%';
    });

    goToPage(1);
}

// ==================== 10. 辅助函数 ====================

/**
 * 显示全屏加载动画
 * @param {string} text - 加载提示文字
 * @param {number} duration - 显示时长（毫秒）
 * @param {Function} callback - 加载完成后执行的回调
 */
function showLoading(text, duration, callback) {
    var loading = document.getElementById('loading');
    document.getElementById('loadingText').textContent = text;
    loading.classList.add('active');

    setTimeout(function() {
        loading.classList.remove('active');
        if (callback) callback();
    }, duration);
}

/** 为元素添加抖动反馈动画（用于输入校验失败） */
function shakeElement(element) {
    element.style.animation = 'none';
    element.offsetHeight;  // 强制回流，重置动画
    element.style.animation = 'shake 0.5s';
    setTimeout(function() { element.style.animation = ''; }, 500);
}

/**
 * 水晶球点击时产生魔法粒子特效
 * @param {Event} event - 点击事件（用于获取容器引用）
 */
function createParticles(event) {
    var container = event.currentTarget;
    for (var i = 0; i < 8; i++) {
        var particle = document.createElement('div');
        particle.className = 'magic-particle';
        particle.style.left = (Math.random() * 100) + '%';
        particle.style.top = '50%';
        particle.style.animationDelay = (Math.random() * 0.5) + 's';
        container.appendChild(particle);
        // 2 秒后自动清理粒子 DOM
        setTimeout(function() { particle.remove(); }, 2000);
    }
}
