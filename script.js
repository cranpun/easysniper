
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startButton = document.getElementById('start-button');
const scoreEl = document.getElementById('score');
const missesEl = document.getElementById('misses');
const timerEl = document.getElementById('timer'); // Timer element

let score = 0;
let misses = 0;
let targets = [];
let hitEffects = [];
let missEffects = [];
let gameRunning = false;
let scopeActive = false;
let mouseX = 0;
let mouseY = 0;
let gameTimer = null; // To hold the interval ID
let timeLeft = 30;

canvas.width = 800;
canvas.height = 600;

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function createTarget() {
    const size = random(10, 50);
    const speed = random(1, 3);
    const angle = random(0, Math.PI * 2);
    targets.push({
        x: random(size, canvas.width - size),
        y: random(size, canvas.height - size),
        dx: Math.cos(angle) * speed,
        dy: Math.sin(angle) * speed,
        size: size,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        createdAt: Date.now(),
        lifetime: random(5000, 10000)
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawAllTargets = () => {
        const now = Date.now();
        targets.forEach(target => {
            const age = now - target.createdAt;
            const lifeProgress = age / target.lifetime;
            const fadeStartProgress = 0.5;
            let opacity = 1.0;
            if (lifeProgress > fadeStartProgress) {
                opacity = 1 - (lifeProgress - fadeStartProgress) / (1 - fadeStartProgress);
            }

            const points = Math.round(100 / target.size);
            const maxPoints = 10;
            const minPoints = 2;
            const pointRange = maxPoints - minPoints;
            const normalizedPoints = (points - minPoints) / pointRange;
            const hue = 240 - Math.max(0, Math.min(1, normalizedPoints)) * 240;

            ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${opacity})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
            ctx.lineWidth = 2;

            ctx.beginPath();
            if (target.shape === 'rect') {
                ctx.rect(target.x - target.size / 2, target.y - target.size / 2, target.size, target.size);
            } else {
                ctx.arc(target.x, target.y, target.size / 2, 0, Math.PI * 2);
            }
            ctx.fill();
            ctx.stroke();
        });
    };

    const drawHitEffects = () => {
        const now = Date.now();
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        hitEffects.forEach(effect => {
            const age = now - effect.createdAt;
            const duration = 1000;
            if (age < duration) {
                const progress = age / duration;
                const opacity = 1 - progress;
                const y = effect.y - progress * 50;
                ctx.fillStyle = `rgba(255, 215, 0, ${opacity})`;
                ctx.fillText(`+${effect.points}`, effect.x, y);
            }
        });
    };

    const drawMissEffects = () => {
        const now = Date.now();
        missEffects.forEach(effect => {
            const age = now - effect.createdAt;
            const duration = 500;
            if (age < duration) {
                const progress = age / duration;
                const opacity = 1 - progress;
                const size = 5 + progress * 15;
                ctx.save();
                ctx.translate(effect.x, effect.y);
                ctx.lineWidth = 4;
                ctx.strokeStyle = `rgba(255, 0, 0, ${opacity})`;
                ctx.beginPath();
                ctx.moveTo(-size, -size);
                ctx.lineTo(size, size);
                ctx.moveTo(size, -size);
                ctx.lineTo(-size, size);
                ctx.stroke();
                ctx.font = 'bold 16px Arial';
                ctx.fillStyle = `rgba(255, 0, 0, ${opacity})`;
                ctx.fillText('MISS', 0, -size - 5);
                ctx.restore();
            }
        });
    };

    if (!scopeActive) {
        drawAllTargets();
        drawHitEffects();
        drawMissEffects();
    } else {
        const scopeRadius = 150;
        ctx.save();
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(mouseX, mouseY, scopeRadius, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(mouseX, mouseY);
        ctx.scale(2, 2);
        ctx.translate(-mouseX, -mouseY);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawAllTargets();
        drawHitEffects();
        drawMissEffects();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(mouseX, mouseY, scopeRadius, 0, Math.PI * 2);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(mouseX - scopeRadius, mouseY);
        ctx.lineTo(mouseX + scopeRadius, mouseY);
        ctx.moveTo(mouseX, mouseY - scopeRadius);
        ctx.lineTo(mouseX, mouseY + scopeRadius);
        ctx.strokeStyle = 'black';
        ctx.stroke();
    }
}

function updateGame() {
    if (!gameRunning) return;

    const now = Date.now();
    targets = targets.filter(target => now - target.createdAt < target.lifetime);
    hitEffects = hitEffects.filter(effect => now - effect.createdAt < 1000);
    missEffects = missEffects.filter(effect => now - effect.createdAt < 500);

    const speedModifier = scopeActive ? 0.25 : 1;

    targets.forEach(target => {
        target.x += target.dx * speedModifier;
        target.y += target.dy * speedModifier;
        if (target.x - target.size / 2 < 0 || target.x + target.size / 2 > canvas.width) target.dx *= -1;
        if (target.y - target.size / 2 < 0 || target.y + target.size / 2 > canvas.height) target.dy *= -1;
    });

    if (targets.length < 5) {
        createTarget();
    }

    draw();
    requestAnimationFrame(updateGame);
}

function startGame() {
    score = 0;
    misses = 0;
    timeLeft = 30;
    targets = [];
    hitEffects = [];
    missEffects = [];
    scoreEl.textContent = score;
    missesEl.textContent = misses;
    timerEl.textContent = timeLeft;
    gameRunning = true;
    startButton.disabled = true;

    // Start the countdown timer
    gameTimer = setInterval(() => {
        timeLeft--;
        timerEl.textContent = timeLeft;
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    updateGame();
}

function endGame() {
    if (!gameRunning) return; // Prevent multiple calls
    clearInterval(gameTimer); // Stop the timer
    gameRunning = false;
    startButton.disabled = false;
    scopeActive = false;
    draw();
    alert(`Time's up! Your final score: ${score}`);
}

canvas.addEventListener('mousedown', e => {
    if (!gameRunning) return;

    if (e.button === 0) { // Left click
        let hit = false;
        const clickX = scopeActive ? (e.offsetX - mouseX) / 2 + mouseX : e.offsetX;
        const clickY = scopeActive ? (e.offsetY - mouseY) / 2 + mouseY : e.offsetY;

        for (let i = targets.length - 1; i >= 0; i--) {
            const target = targets[i];
            const dist = Math.hypot(clickX - target.x, clickY - target.y);
            if (dist < target.size / 2) {
                hit = true;
                const points = Math.round(100 / target.size);
                score += points;
                scoreEl.textContent = score;
                hitEffects.push({ x: target.x, y: target.y, points: points, createdAt: Date.now() });
                targets.splice(i, 1);
                break;
            }
        }

        if (!hit) {
            misses++;
            missesEl.textContent = misses;
            missEffects.push({ x: clickX, y: clickY, createdAt: Date.now() });
            if (misses >= 3) {
                endGame();
            }
        }
    } else if (e.button === 2) { // Right click
        scopeActive = true;
    }
});

canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
});

canvas.addEventListener('mouseup', e => {
    if (e.button === 2) { // Right click
        scopeActive = false;
    }
});

canvas.addEventListener('mousemove', e => {
    mouseX = e.offsetX;
    mouseY = e.offsetY;
});

startButton.addEventListener('click', startGame);
