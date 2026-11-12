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
    let unlockTimer = null;
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    // Each card is driven by at most one animation at a time. Starting a new
    // one cancels whatever is still running on that card; otherwise a stale
    // tween (the intro, a restack, a restart) keeps writing its end pose after
    // a shorter toss has finished and drags a discarded card back on top.
    function animateCard(card, { zIndex, ...params }) {
        anime.remove(card);
        if (zIndex !== undefined) card.style.zIndex = zIndex;
        return anime({ targets: card, ...params });
    }

    // Lock input for a fixed time instead of waiting on an animation's
    // complete callback, which never fires once that animation is cancelled.
    function lockFor(ms, then) {
        isAnimating = true;
        clearTimeout(unlockTimer);
        unlockTimer = setTimeout(() => {
            isAnimating = false;
            if (then) then();
        }, ms);
    }

    // Resting pose for a card `offset` places below the top of the deck.
    function stackPose(offset) {
        return {
            translateX: 0,
            translateY: offset * 30,
            scale: 1 - (offset * 0.05),
            translateZ: -offset * 50,
            rotateZ: 0,
            rotateX: 0,
            opacity: offset > 2 ? 0 : 1, // Only show top 3
            zIndex: 100 - offset,
        };
    }

    function updateButtons() {
        prevBtn.disabled = currentIdx === 0;
        resetBtn.disabled = currentIdx === 0;
        nextBtn.disabled = currentIdx === cards.length;
    }

    // Settle every card still in the deck into its slot, except any in `skip`
    // that already have their own animation.
    function updateDeckVisuals(skip = new Set()) {
        cards.forEach((card, idx) => {
            if (idx < currentIdx || skip.has(card)) return; // Already tossed
            animateCard(card, {
                ...stackPose(idx - currentIdx),
                duration: 600,
                easing: 'easeOutQuint',
            });
        });
        updateButtons();
    }

    // Initial positioning: hide immediately to block flicker, then deal the
    // deck in one card at a time.
    anime.set(cards, { opacity: 0 });
    cards.forEach((card, i) => {
        animateCard(card, {
            ...stackPose(i),
            opacity: i > 2 ? 0 : [0, 1],
            duration: 800,
            delay: i * 150,
            easing: 'easeOutQuint',
        });
    });
    updateButtons();

    function nextCard(dirX = -1, dirY = 0) {
        if (typeof dirX === 'object') dirX = -1;
        if (typeof dirY === 'object') dirY = 0;
        if (currentIdx >= cards.length || isAnimating) return;
        isDragging = false; // Abort any active drag to prevent race conditions

        const cardToToss = cards[currentIdx];
        currentIdx++;
        lockFor(400);

        // Toss animation in the given direction
        animateCard(cardToToss, {
            translateX: dirX * window.innerWidth * 1.5,
            translateY: dirY * window.innerHeight * 1.5,
            rotateZ: dirX * 15,
            rotateX: 10,
            opacity: 0,
            duration: 400, // snappier duration
            easing: 'easeOutExpo', // immediate fly off
        });
        updateDeckVisuals();
    }

    function prevCard() {
        if (currentIdx <= 0 || isAnimating) return;
        isDragging = false; // Abort any active drag

        currentIdx--;
        const cardToRecover = cards[currentIdx];
        lockFor(800);

        // Recover animation from the left
        animateCard(cardToRecover, {
            translateX: [-window.innerWidth, 0],
            translateY: [0, 0],
            scale: 1,
            rotateZ: [-15, 0],
            rotateX: [10, 0],
            translateZ: [50, 0],
            opacity: [0, 1],
            zIndex: 100, // Forces top immediately during animation
            duration: 800,
            easing: 'easeOutQuart',
        });
        updateDeckVisuals(new Set([cardToRecover]));
    }

    function resetDeck() {
        if (currentIdx === 0 || isAnimating) return;
        isDragging = false; // Abort any active drag

        // Deepest tossed card flies back first, the hero card lands last on top
        const cardsToRecover = cards.slice(0, currentIdx).reverse();
        currentIdx = 0;

        // Let the cards still in the deck sink down to their final slots
        updateDeckVisuals(new Set(cardsToRecover));

        cardsToRecover.forEach((card, k) => {
            const offset = Math.min(parseInt(card.dataset.index), 3);
            animateCard(card, {
                translateX: [-window.innerWidth, 0],
                translateY: [0, offset * 30],
                scale: [1, 1 - (offset * 0.05)],
                translateZ: [50, -offset * 50],
                rotateZ: [-15, 0],
                rotateX: [10, 0],
                opacity: [0, 1], // Always visible during the fly-in
                zIndex: 100 - parseInt(card.dataset.index),
                duration: 800,
                delay: k * 150, // Fly in rapidly one by one
                easing: 'easeOutQuart',
            });
        });

        // Once every card has landed, fade out the ones buried below the top 3
        lockFor(800 + (cardsToRecover.length - 1) * 150, () => updateDeckVisuals());
    }

    prevBtn.addEventListener('click', prevCard);
    nextBtn.addEventListener('click', nextCard);
    resetBtn.addEventListener('click', resetDeck);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextCard();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prevCard();
    });

    // --- DRAG / SWIPE LOGIC ---

    // Swipes in every direction belong to the deck: the page itself never
    // scrolls, so the browser has no use for them. Only a card whose content
    // overflows (a viewport too short for the card's shape) lets the browser
    // pan vertically so that content can still be scrolled by touch.
    function syncTouchAction() {
        cards.forEach(card => {
            const content = card.querySelector('.card-content');
            const overflows = content.scrollHeight > content.clientHeight + 1;
            content.style.touchAction = overflows ? 'pan-y' : 'none';
        });
    }
    syncTouchAction();
    window.addEventListener('resize', syncTouchAction);
    if (document.fonts) document.fonts.ready.then(syncTouchAction);

    function springBack(card) {
        animateCard(card, {
            translateX: 0,
            translateY: 0, // ensure Y returns to 0
            scale: 1,
            rotateZ: 0,
            duration: 400,
            easing: 'easeOutElastic(1, .8)'
        });
    }

    cards.forEach(card => {
        card.addEventListener('pointerdown', (e) => {
            // Only drag top card
            const myIndex = parseInt(card.dataset.index);
            if (myIndex !== currentIdx || isAnimating) return;

            // Only allow background of card to trigger drag, not buttons/links
            if (e.target.closest('.btn') || e.target.closest('a')) return;

            startX = e.clientX;
            startY = e.clientY;
            startTime = Date.now();
            isDragging = true;
            card.setPointerCapture(e.pointerId);

            // Slightly pull the card up visually
            animateCard(card, { scale: 1.02, duration: 200, easing: 'easeOutQuad' });
        });

        card.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            const myIndex = parseInt(card.dataset.index);
            if (myIndex !== currentIdx) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            // Allow drag in any direction; the finger owns the card now
            anime.remove(card);
            anime.set(card, {
                translateX: dx,
                translateY: dy,
                scale: 1.02,
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
                springBack(card); // Too short to count as a swipe
            }
        });

        // The browser took the gesture over (a pan on a scrollable card, a
        // system gesture): drop the drag and put the card back.
        card.addEventListener('pointercancel', () => {
            if (!isDragging) return;
            isDragging = false;
            if (parseInt(card.dataset.index) === currentIdx) springBack(card);
        });
    });
});
