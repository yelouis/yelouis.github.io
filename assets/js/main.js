document.addEventListener('DOMContentLoaded', () => {

    // --- RANDOMIZE CARD COLORS ---
    const paletteClasses = ['primary-block', 'secondary-block', 'tertiary-block'];
    const cardContents = document.querySelectorAll('.card-content');
    let lastClass = null;

    cardContents.forEach(content => {
        content.classList.remove('primary-block', 'secondary-block', 'tertiary-block');
        
        let availableClasses = paletteClasses;
        if (lastClass) {
            availableClasses = paletteClasses.filter(c => c !== lastClass);
        }
        
        const randomClass = availableClasses[Math.floor(Math.random() * availableClasses.length)];
        content.classList.add(randomClass);
        lastClass = randomClass;
    });

    // --- SNORLAX ANIMATIONS ---
    anime({
        targets: '.z-1',
        translateY: [-10, -50],
        translateX: [0, 20],
        opacity: [0, 1, 0],
        scale: [1, 1.5],
        duration: 3500,
        easing: 'linear',
        loop: true,
        delay: 2000
    });
    anime({
        targets: '.z-2',
        translateY: [-5, -30],
        translateX: [0, 15],
        opacity: [0, 1, 0],
        scale: [1, 1.3],
        duration: 3500,
        easing: 'linear',
        loop: true,
        delay: 1000
    });
    anime({
        targets: '.z-3',
        translateY: [0, -15],
        translateX: [0, 10],
        opacity: [0, 1, 0],
        scale: [1, 1.2],
        duration: 3500,
        easing: 'linear',
        loop: true,
        delay: 0
    });
    anime({
        targets: '.snorlax',
        scaleY: [1, 1.05],
        scaleX: [1, 0.98],
        direction: 'alternate',
        loop: true,
        duration: 2000,
        easing: 'easeInOutSine'
    });

    // --- DECK LOGIC ---
    let currentIdx = 0;
    const cards = Array.from(document.querySelectorAll('.card'));
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const resetBtn = document.getElementById('resetBtn');
    let isAnimating = false;

    function updateDeckVisuals() {
        cards.forEach((card, idx) => {
            if (idx < currentIdx) return; // Animated away previously
            
            const offset = (idx - currentIdx); // 0 is top, 1 is under, 2 is bottom
            
            anime({
                targets: card,
                translateY: offset * 30,
                scale: 1 - (offset * 0.05),
                translateZ: -offset * 50,
                rotateZ: 0, // Reset random drag rotations
                rotateX: 0,
                opacity: offset > 2 ? 0 : 1, // Only show top 3
                zIndex: 100 - offset,
                duration: 600,
                easing: 'easeOutQuint',
            });
        });

        // Update nav buttons
        prevBtn.disabled = currentIdx === 0;
        resetBtn.disabled = currentIdx === 0;
        nextBtn.disabled = currentIdx === cards.length;
    }

    // Initial positioning
    anime.set(cards, { opacity: 0 }); // Hide immediately to block flicker
    
    // In sequence stagger animate in
    anime({
        targets: cards,
        translateY: (el, i) => (i * 30),
        scale: (el, i) => 1 - (i * 0.05),
        translateZ: (el, i) => -(i * 50),
        opacity: (el, i) => i > 2 ? 0 : [0, 1],
        zIndex: (el, i) => 100 - i,
        duration: 800,
        delay: anime.stagger(150),
        easing: 'easeOutQuint',
    });

    function nextCard(dir = -1) {
        if (currentIdx >= cards.length || isAnimating) return;
        isAnimating = true;
        
        const cardToToss = cards[currentIdx];
        if (!cardToToss) {
            isAnimating = false;
            return;
        }
        currentIdx++;
        
        // Toss animation horizontally
        anime({
            targets: cardToToss,
            translateX: dir * window.innerWidth * 1.5,
            rotateZ: dir * 15,
            rotateX: 10,
            opacity: 0,
            duration: 800,
            easing: 'easeInQuart',
            complete: () => {
                isAnimating = false;
            }
        });
        updateDeckVisuals();
    }

    function prevCard() {
        if (currentIdx <= 0 || isAnimating) return;
        isAnimating = true;
        
        currentIdx--;
        const cardToRecover = cards[currentIdx];
        
        // Recover animation from left by default
        anime({
            targets: cardToRecover,
            translateX: [-window.innerWidth, 0],
            rotateZ: [-15, 0],
            rotateX: [10, 0],
            translateZ: [50, 0],
            opacity: [0, 1],
            zIndex: 100, // Forces top immediately during animation
            duration: 800,
            easing: 'easeOutQuart',
            complete: () => {
                isAnimating = false;
            }
        });
        updateDeckVisuals();
    }

    function resetDeck() {
        if (currentIdx === 0 || isAnimating) return;
        isAnimating = true;

        // Take all tossed cards and reverse them so the top card flies in last
        const cardsToRecover = cards.slice(0, currentIdx).reverse();
        currentIdx = 0;
        updateDeckVisuals(); // Instant snap background properties

        // Recover animation sequence
        anime({
            targets: cardsToRecover,
            translateX: [-window.innerWidth, 0],
            rotateZ: [-15, 0],
            rotateX: [10, 0],
            translateZ: [50, 0],
            opacity: [0, 1],
            zIndex: (el, i, l) => 100 + i, // Highest z-index to fly above rest
            duration: 800,
            delay: anime.stagger(100), // Stagger fly-in rapidly
            easing: 'easeOutQuart',
            complete: () => {
                isAnimating = false;
                updateDeckVisuals(); // Re-sync Z-indexes statically
            }
        });
    }

    prevBtn.addEventListener('click', prevCard);
    nextBtn.addEventListener('click', nextCard);
    resetBtn.addEventListener('click', resetDeck);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextCard();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevCard();
    });

    // --- DRAG / SWIPE LOGIC ---
    let startX = 0;
    let isDragging = false;
    let startTime = 0;

    cards.forEach(card => {
        card.addEventListener('pointerdown', (e) => {
            // Only drag top card
            const myIndex = parseInt(card.dataset.index);
            if (myIndex !== currentIdx || isAnimating) return;
            
            // Only allow background of card to trigger drag, not buttons/links or scrollbar
            // Prevent drag if click inside a scrollable area that is actually scrolling
            if (e.target.closest('.btn') || e.target.closest('a')) return;
            
            startX = e.clientX;
            startTime = Date.now();
            isDragging = true;
            card.setPointerCapture(e.pointerId);
            
            // Slightly pull the card up visually
            anime({ targets: card, scale: 1.02, duration: 200, easing: 'easeOutQuad' });
        });

        card.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const myIndex = parseInt(card.dataset.index);
            if (myIndex !== currentIdx) return;
            
            const dx = e.clientX - startX;
            // Allow left or right drag
            anime.set(card, {
                translateX: dx,
                rotateZ: dx * 0.05 // tilt slightly while dragging
            });
        });

        card.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false;
            card.releasePointerCapture(e.pointerId);
            
            const dx = e.clientX - startX;
            const velocity = Math.abs(dx) / (Date.now() - startTime);

            // If swiped far enough or fast enough horizontally
            if (Math.abs(dx) > 100 || (Math.abs(dx) > 20 && velocity > 0.5)) {
                const dir = dx > 0 ? 1 : -1;
                nextCard(dir);
            } else {
                // Return to base position
                anime({
                    targets: card,
                    translateX: 0,
                    scale: 1,
                    rotateZ: 0,
                    duration: 400,
                    easing: 'easeOutElastic(1, .8)'
                });
            }
        });
    });
});