document.addEventListener('DOMContentLoaded', () => {
    
    /* ══════════════════════════════════════════════
       NAVBAR SCROLL EFFECT
       ══════════════════════════════════════════════ */
    const mainNav = document.getElementById('mainNav');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 100) {
            mainNav.classList.add('scrolled');
        } else {
            mainNav.classList.remove('scrolled');
        }
    });

    /* ══════════════════════════════════════════════
       MOBILE MENU TOGGLE
       ══════════════════════════════════════════════ */
    const hamburger = document.getElementById('hamburger');
    const mobileMenu = document.getElementById('mobileMenu');
    
    hamburger.addEventListener('click', () => {
        mobileMenu.classList.toggle('active');
        hamburger.classList.toggle('open');
        
        // Prevent body scroll when menu is open
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });

    const mobileClose = document.getElementById('mobileClose');
    if (mobileClose) {
        mobileClose.addEventListener('click', () => {
            mobileMenu.classList.remove('active');
            hamburger.classList.remove('open');
            document.body.style.overflow = '';
        });
    }

    // Close mobile menu on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            // Don't close if clicking a dropdown toggle
            if (link.closest('.mobile-dropdown') && link.tagName === 'SPAN') return;
            
            mobileMenu.classList.remove('active');
            hamburger.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Mobile Dropdown Toggle
    const mobileDropdowns = document.querySelectorAll('.mobile-dropdown');
    mobileDropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('span');
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            dropdown.classList.toggle('open');
        });
    });

    /* ══════════════════════════════════════════════
       HERO CAROUSEL LOGIC
       ══════════════════════════════════════════════ */
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    const prevBtn = document.getElementById('carouselPrev');
    const nextBtn = document.getElementById('carouselNext');
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
        slides.forEach(slide => slide.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        slides[index].classList.add('active');
        dots[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        let index = (currentSlide + 1) % slides.length;
        showSlide(index);
    }

    function prevSlide() {
        let index = (currentSlide - 1 + slides.length) % slides.length;
        showSlide(index);
    }

    if (nextBtn && prevBtn) {
        nextBtn.addEventListener('click', () => {
            nextSlide();
            resetInterval();
        });
        
        prevBtn.addEventListener('click', () => {
            prevSlide();
            resetInterval();
        });
    }

    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            showSlide(index);
            resetInterval();
        });
    });

    function startInterval() {
        slideInterval = setInterval(nextSlide, 6000);
    }

    function resetInterval() {
        clearInterval(slideInterval);
        startInterval();
    }

    startInterval();

    /* ══════════════════════════════════════════════
       LEADERSHIP CAROUSEL LOGIC
       ══════════════════════════════════════════════ */
    const leadSlides = document.querySelectorAll('.leadership-slide');
    const leadThumbs = document.querySelectorAll('.thumb-item');
    const leadPrevBtn = document.getElementById('leadPrev');
    const leadNextBtn = document.getElementById('leadNext');
    let currentLeadSlide = 0;

    function showLeadSlide(index) {
        if (!leadSlides.length) return;
        leadSlides.forEach(slide => slide.classList.remove('active'));
        leadThumbs.forEach(thumb => thumb.classList.remove('active'));
        
        leadSlides[index].classList.add('active');
        leadThumbs[index].classList.add('active');
        currentLeadSlide = index;

        // Auto-scroll thumbnails into view on mobile
        const activeThumb = leadThumbs[index];
        const container = document.querySelector('.leadership-thumbs');
        if (container && activeThumb) {
            const scrollLeft = activeThumb.offsetLeft - (container.offsetWidth / 2) + (activeThumb.offsetWidth / 2);
            container.scrollTo({ left: scrollLeft, behavior: 'smooth' });
        }
    }

    if (leadNextBtn && leadPrevBtn && leadSlides.length > 0) {
        leadNextBtn.addEventListener('click', () => {
            let index = (currentLeadSlide + 1) % leadSlides.length;
            showLeadSlide(index);
        });
        
        leadPrevBtn.addEventListener('click', () => {
            let index = (currentLeadSlide - 1 + leadSlides.length) % leadSlides.length;
            showLeadSlide(index);
        });
    }

    leadThumbs.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            showLeadSlide(index);
        });
    });

    /* ══════════════════════════════════════════════
       REVEAL ON SCROLL (Intersection Observer)
       ══════════════════════════════════════════════ */
    const revealElements = document.querySelectorAll('[class*="reveal-"]');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal-visible');
            }
        });
    }, {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));

    /* ══════════════════════════════════════════════
       STATS COUNTER ANIMATION
       ══════════════════════════════════════════════ */
    const stats = document.querySelectorAll('.stat-number');
    let statsStarted = false;

    function startCounters() {
        stats.forEach(stat => {
            const target = +stat.getAttribute('data-target');
            const duration = 2000; // 2 seconds
            const increment = target / (duration / 16); // 60fps
            
            let current = 0;
            const updateCount = () => {
                current += increment;
                if (current < target) {
                    stat.innerText = Math.ceil(current);
                    setTimeout(updateCount, 16);
                } else {
                    stat.innerText = target;
                }
            };
            updateCount();
        });
    }

    const statsObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !statsStarted) {
            startCounters();
            statsStarted = true;
        }
    }, { threshold: 0.5 });

    if (stats.length > 0) {
        statsObserver.observe(document.querySelector('.stats-strip'));
    }

    /* ══════════════════════════════════════════════
       SMOOTH ANCHOR SCROLLING
       ══════════════════════════════════════════════ */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                const headerOffset = 100;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

});
