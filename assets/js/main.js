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
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    function updateDeckVisuals() {
        cards.forEach((card, idx) => {
            if (idx < currentIdx) return; // Animated away previously
            
            const offset = (idx - currentIdx); // 0 is top, 1 is under, 2 is bottom
            
            anime({
                targets: card,
                translateX: 0, // Explicitly reset drag X
                translateY: offset * 30, // Safely resets drag Y to visual offset
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

    function nextCard(dirX = -1, dirY = 0) {
        if (typeof dirX === 'object') dirX = -1;
        if (typeof dirY === 'object') dirY = 0;

        if (currentIdx >= cards.length || isAnimating) return;
        isAnimating = true;
        isDragging = false; // Abort any active drag to prevent race conditions
        
        const cardToToss = cards[currentIdx];
        if (!cardToToss) {
            isAnimating = false;
            return;
        }
        currentIdx++;
        
        // Toss animation in the given direction
        anime({
            targets: cardToToss,
            translateX: dirX * window.innerWidth * 1.5,
            translateY: dirY * window.innerHeight * 1.5,
            rotateZ: dirX * 15,
            rotateX: 10,
            opacity: 0,
            duration: 400, // snappier duration
            easing: 'easeOutExpo', // immediate fly off
            complete: () => {
                isAnimating = false;
            }
        });
        updateDeckVisuals();
    }

    function prevCard() {
        if (currentIdx <= 0 || isAnimating) return;
        isAnimating = true;
        isDragging = false; // Abort any active drag
        
        currentIdx--;
        const cardToRecover = cards[currentIdx];
        
        // Recover animation from left by default
        anime({
            targets: cardToRecover,
            translateX: [-window.innerWidth, 0],
            translateY: [0, 0],
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
        isDragging = false; // Abort any active drag

        const cardsToRecover = cards.slice(0, currentIdx).reverse();
        const backgroundCards = cards.slice(currentIdx);
        currentIdx = 0; // Final state
        
        // Instantly update nav buttons
        prevBtn.disabled = true;
        resetBtn.disabled = true;
        nextBtn.disabled = false;
        
        // Let the remaining deck cards sink down out of the way instantly
        backgroundCards.forEach((card) => {
            const finalIdx = parseInt(card.dataset.index);
            anime({
                targets: card,
                translateX: 0,
                translateY: finalIdx * 30, 
                scale: 1 - (finalIdx * 0.05),
                translateZ: -finalIdx * 50,
                rotateZ: 0,
                rotateX: 0,
                opacity: finalIdx > 2 ? 0 : 1,
                zIndex: 100 - finalIdx,
                duration: 600,
                easing: 'easeOutQuint',
            });
        });

        // Recover animation sequence
        anime({
            targets: cardsToRecover,
            translateX: [-window.innerWidth, 0],
            translateY: (el) => {
                const finalIdx = parseInt(el.dataset.index);
                const offset = Math.min(finalIdx, 3);
                return [0, offset * 30];
            },
            scale: (el) => {
                const finalIdx = parseInt(el.dataset.index);
                const offset = Math.min(finalIdx, 3);
                return [1, 1 - (offset * 0.05)];
            },
            translateZ: (el) => {
                const finalIdx = parseInt(el.dataset.index);
                const offset = Math.min(finalIdx, 3);
                return [50, -offset * 50];
            },
            rotateZ: [-15, 0],
            rotateX: [10, 0],
            opacity: [0, 1], // Always visible during the fly-in
            zIndex: (el) => 100 - parseInt(el.dataset.index), // Correctly layer on top of each other
            duration: 800,
            delay: anime.stagger(150), // Stagger fly-in rapidly one by one
            easing: 'easeOutQuart',
            complete: () => {
                isAnimating = false;
                updateDeckVisuals(); // Re-sync Z-indexes and gracefully fade out buried cards
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

    cards.forEach(card => {
        card.addEventListener('pointerdown', (e) => {
            // Only drag top card
            const myIndex = parseInt(card.dataset.index);
            if (myIndex !== currentIdx || isAnimating) return;
            
            // Only allow background of card to trigger drag, not buttons/links or scrollbar
            // Prevent drag if click inside a scrollable area that is actually scrolling
            if (e.target.closest('.btn') || e.target.closest('a')) return;
            
            startX = e.clientX;
            startY = e.clientY;
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
            const dy = e.clientY - startY;
            // Allow drag in any direction
            anime.set(card, {
                translateX: dx,
                translateY: dy,
                rotateZ: dx * 0.05 // tilt slightly while dragging
            });
        });

        card.addEventListener('pointerup', (e) => {
            if (!isDragging) {
                try { card.releasePointerCapture(e.pointerId); } catch(err) {}
                return;
            }
            isDragging = false;
            try { card.releasePointerCapture(e.pointerId); } catch(err) {}
            
            // Double check index hasn't shifted from quick sequential actions
            const myIndex = parseInt(card.dataset.index);
            if (myIndex !== currentIdx) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const distance = Math.hypot(dx, dy);
            const velocity = distance / (Date.now() - startTime);

            // If swiped far enough or fast enough in any direction
            if (distance > 40 || (distance > 10 && velocity > 0.3)) {
                const dirX = dx / distance;
                const dirY = dy / distance;
                nextCard(dirX, dirY);
            } else {
                // Return to base position
                anime({
                    targets: card,
                    translateX: 0,
                    translateY: 0, // ensure Y returns to 0
                    scale: 1,
                    rotateZ: 0,
                    duration: 400,
                    easing: 'easeOutElastic(1, .8)'
                });
            }
        });
    });
});