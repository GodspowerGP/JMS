document.addEventListener('DOMContentLoaded', () => {
    "use strict";

    /* ══════════════════════════════════════════════
        ABOUT PAGE JS
       ══════════════════════════════════════════════ */
    (function () {
        'use strict';

        /* ── Proper Scroll Reveal ─────────────────────────── */
        var revealEls = document.querySelectorAll('.ap-up, .ap-left, .ap-right');
        var revealObs = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
            if (e.isIntersecting) { e.target.classList.add('visible'); revealObs.unobserve(e.target); }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
        revealEls.forEach(function (el) { revealObs.observe(el); });

        /* Trigger hero elements immediately after paint */
        requestAnimationFrame(function () {
            document.querySelectorAll('.ap-hero .ap-up').forEach(function (el) { el.classList.add('visible'); });
        });

        /* ── Counter Animation ─────────────────────── */
        var statEls = document.querySelectorAll('.ap-stat-num[data-target]');
        var counted = false;

        function easeOut(t) { return 1 - Math.pow(1 - t, 3); }

        function animateCounters() {
            if (counted) return;
            counted = true;
            var DURATION = 1800;
            var t0 = performance.now();
            (function tick(now) {
            var p = Math.min((now - t0) / DURATION, 1);
            var e = easeOut(p);
            statEls.forEach(function (el) {
                var tgt = parseInt(el.getAttribute('data-target'), 10);
                var suffix = el.getAttribute('data-suffix') || '';
                el.textContent = (tgt >= 1000)
                ? Math.round(e * (tgt / 1000)) + 'K' + suffix
                : Math.round(e * tgt) + suffix;
            });
            if (p < 1) requestAnimationFrame(tick);
            })(t0);
        }

        var statsEl = document.getElementById('apStatsSection');
        if (statsEl) {
            new IntersectionObserver(function (entries) {
            if (entries[0].isIntersecting) { animateCounters(); }
            }, { threshold: 0.3 }).observe(statsEl);
        }

        /* ── Timeline Drag Scroll ──────────────────── */
        var tml = document.getElementById('apTmlScroll');
        var STEP = 250;
        var dragging = false;
        var startX = 0;
        var scrollL = 0;

        if (tml) {
            tml.addEventListener('mousedown', function (e) {
            dragging = true; startX = e.clientX; scrollL = tml.scrollLeft;
            tml.style.cursor = 'grabbing';
            });
            window.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            tml.scrollLeft = scrollL - (e.clientX - startX);
            });
            window.addEventListener('mouseup', function () {
            dragging = false; tml.style.cursor = 'grab';
            });
            tml.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; scrollL = tml.scrollLeft; }, { passive: true });
            tml.addEventListener('touchmove', function (e) { tml.scrollLeft = scrollL - (e.touches[0].clientX - startX); }, { passive: true });
        }

        function smoothScroll(container, to, ms) {
            var from = container.scrollLeft;
            var diff = to - from;
            var t0 = performance.now();
            (function step(now) {
            var p = Math.min((now - t0) / ms, 1);
            var e = p < .5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
            container.scrollLeft = from + diff * e;
            if (p < 1) requestAnimationFrame(step);
            })(t0);
        }

        var btnPrev = document.getElementById('apTmlPrev');
        var btnNext = document.getElementById('apTmlNext');
        if (btnPrev && tml) btnPrev.addEventListener('click', function () { smoothScroll(tml, tml.scrollLeft - STEP, 420); });
        if (btnNext && tml) btnNext.addEventListener('click', function () { smoothScroll(tml, tml.scrollLeft + STEP, 420); });

    })();
    
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


    /* ══════════════════════════════════════════════
    AWARDS & ACHIEVEMENTS GRID LOGIC
       ══════════════════════════════════════════════ */
    (function () {
    /* ─── DATA ─── */
    var data = [
        /* 2026 */
        { y: 2026, lv: 'overall',  t: 'Overall Winner',                          c: 'Hadiza Ibrahim Aliyu Schools Festival (HIASFEST)',      i: 'fa-trophy'        },
        { y: 2026, lv: 'overall',  t: 'Star Prize',                              c: 'Hadiza Ibrahim Aliyu Schools Festival (HIASFEST)',      i: 'fa-star'          },
        { y: 2026, lv: 'winner',   t: 'Winner — Poetry',                         c: 'Nigeria Teen Authors Prize',                            i: 'fa-pen-nib'       },
        { y: 2026, lv: 'r2',       t: 'Second Runner-Up — Poetry',               c: 'Nigeria Teen Authors Prize',                            i: 'fa-pen-nib'       },
        { y: 2026, lv: 'winner',   t: 'Winner — On-the-Spot Poetry',             c: 'HIASFEST 2026',                                         i: 'fa-pen-nib'       },
        { y: 2026, lv: 'r2',       t: 'Second Runner-Up — On-the-Spot Poetry',   c: 'HIASFEST 2026',                                         i: 'fa-pen-nib'       },
        { y: 2026, lv: 'winner',   t: 'Winner — Spoken Word Poetry',             c: 'HIASFEST 2026',                                         i: 'fa-microphone'    },
        { y: 2026, lv: 'r1',       t: 'First Runner-Up — Drama',                 c: 'HIASFEST 2026',                                         i: 'fa-theater-masks' },
        { y: 2026, lv: 'r1',       t: 'First Runner-Up — On-the-Spot Short Story', c: 'HIASFEST 2026',                                       i: 'fa-book-open'     },
        /* 2025 */
        { y: 2025, lv: 'overall',  t: 'Teen Artist of the Year',                 c: 'SEVHAGE Teen Artist Award',                             i: 'fa-palette'       },
        { y: 2025, lv: 'overall',  t: 'Overall Second Place',                    c: 'HIASFEST 2025',                                         i: 'fa-trophy'        },
        { y: 2025, lv: 'winner',   t: 'Winner — Literature',                     c: 'BCD-Utulu Prize for Literature',                        i: 'fa-feather'       },
        { y: 2025, lv: 'winner',   t: 'Winner — On-the-Spot Poetry',             c: 'HIASFEST 2025',                                         i: 'fa-pen-nib'       },
        { y: 2025, lv: 'winner',   t: 'Winner — Spoken Word Poetry',             c: 'HIASFEST 2025',                                         i: 'fa-microphone'    },
        { y: 2025, lv: 'r1',       t: 'First Runner-Up — On-the-Spot Poetry',    c: 'HIASFEST 2025',                                         i: 'fa-pen-nib'       },
        { y: 2025, lv: 'r1',       t: 'First Runner-Up — On-the-Spot Fiction',   c: 'HIASFEST 2025',                                         i: 'fa-book-open'     },
        { y: 2025, lv: 'r2',       t: 'Second Runner-Up — Poetry',               c: 'Nigeria Teen Authors Prize',                            i: 'fa-pen-nib'       },
        /* 2024 */
        { y: 2024, lv: 'overall',  t: 'Overall Second Place',                    c: 'HIASFEST 2024',                                         i: 'fa-trophy'        },
        { y: 2024, lv: 'winner',   t: 'Winner — On-the-Spot Poetry',             c: 'HIASFEST 2024',                                         i: 'fa-pen-nib'       },
        { y: 2024, lv: 'winner',   t: 'Winner — Spoken Word Poetry',             c: 'HIASFEST 2024',                                         i: 'fa-microphone'    },
        { y: 2024, lv: 'r1',       t: 'First Runner-Up — On-the-Spot Poetry',    c: 'HIASFEST 2024',                                         i: 'fa-pen-nib'       },
        /* 2023 */
        { y: 2023, lv: 'overall',  t: 'Overall Third Place',                     c: 'HIASFEST 2023',                                         i: 'fa-trophy'        },
        { y: 2023, lv: 'winner',   t: 'Winner — Poetry',                         c: 'Nigeria Teen Authors Prize',                            i: 'fa-pen-nib'       },
        { y: 2023, lv: 'winner',   t: 'Winner — Prose',                          c: 'Nigeria Teen Authors Prize',                            i: 'fa-book-open'     },
        { y: 2023, lv: 'winner',   t: 'Winner — On-the-Spot Poetry',             c: 'HIASFEST 2023',                                         i: 'fa-pen-nib'       },
        { y: 2023, lv: 'winner',   t: "Winner — Mona Faruk's Scholarship (MVC Female)", c: 'Mona Faruk Foundation',                          i: 'fa-graduation-cap'},
        { y: 2023, lv: 'r2',       t: 'Second Runner-Up — Craft / Innovation',   c: 'HIASFEST 2023',                                         i: 'fa-robot'      },
        /* 2022 */
        { y: 2022, lv: 'winner',   t: "Winner — Mona Faruk's Scholarship (MVC Female)", c: 'Mona Faruk Foundation',                          i: 'fa-graduation-cap'},
        { y: 2022, lv: 'winner',   t: 'Winner — Craft Category',                 c: 'HIASFEST 2022',                                         i: 'fa-robot'      },
        { y: 2022, lv: 'winner',   t: 'Winner — Poetry Prize',                   c: 'Uzo-Udegbunam Chioma Poetry Prize',                     i: 'fa-feather'       },
        { y: 2022, lv: 'r1',       t: 'First Runner-Up — Poetry',                c: 'Nigeria Teen Authors Prize',                            i: 'fa-pen-nib'       },
        { y: 2022, lv: 'r1',       t: 'First Runner-Up — Spoken Word',           c: 'HIASFEST 2022',                                         i: 'fa-microphone'    },
        { y: 2022, lv: 'r1',       t: 'First Runner-Up — Poetry Prize',          c: 'Uzo-Udegbunam Chioma Poetry Prize',                     i: 'fa-feather'       },
        { y: 2022, lv: 'r2',       t: 'Second Runner-Up — Poetry',               c: 'Nigeria Teen Authors Prize',                            i: 'fa-pen-nib'       },
        { y: 2022, lv: 'r2',       t: 'Second Runner-Up — Prose',                c: 'Nigeria Prize for Teen Authors',                        i: 'fa-book-open'     },
        { y: 2022, lv: 'r2',       t: 'Second Runner-Up — On-the-Spot Poetry',   c: 'HIASFEST 2022',                                         i: 'fa-pen-nib'       },
        /* 2021 */
        { y: 2021, lv: 'winner',   t: 'Winner — On-the-Spot Poetry',             c: 'HIASFEST 2021',                                         i: 'fa-pen-nib'       },
        { y: 2021, lv: 'winner',   t: 'Winner — Spot-Writing Contest',           c: 'Feast of Words 2021',                                   i: 'fa-pen'           },
        { y: 2021, lv: 'winner',   t: 'Winner — Oral Poetry Contest',            c: 'Feast of Words 2021',                                   i: 'fa-microphone'    },
        { y: 2021, lv: 'r1',       t: 'First Runner-Up — On-the-Spot Poetry',    c: 'HIASFEST 2021',                                         i: 'fa-pen-nib'       },
        { y: 2021, lv: 'r1',       t: 'First Runner-Up — Spot-Writing Contest',  c: 'Feast of Words 2021',                                   i: 'fa-pen'           },
        { y: 2021, lv: 'r1',       t: 'First Runner-Up — Oral Poetry Contest',   c: 'Feast of Words 2021',                                   i: 'fa-microphone'    },
        { y: 2021, lv: 'r2',       t: 'Second Runner-Up — Spoken Word',          c: 'HIASFEST 2021',                                         i: 'fa-microphone'    },
        { y: 2021, lv: 'r2',       t: 'Second Runner-Up — Spot-Writing Contest', c: 'Feast of Words 2021',                                   i: 'fa-pen'           },
        { y: 2021, lv: 'r2',       t: 'Second Runner-Up — Oral Poetry Contest',  c: 'Feast of Words 2021',                                   i: 'fa-microphone'    },
        /* 2020 */
        { y: 2020, lv: 'winner',   t: 'Winner — Poetry Contest',                 c: 'Cradle Poetry Contest',                                 i: 'fa-feather'       },
        { y: 2020, lv: 'r1',       t: 'First Runner-Up — Creative Writing',      c: 'National Creative Writing Competition (S.S.C)',         i: 'fa-book-open'     },
        /* 2019 */
        { y: 2019, lv: 'winner',   t: 'Winner — Poetry Prize',                   c: 'Korea-Nigeria Poetry Prize (Secondary School)',         i: 'fa-globe-asia'    },
        { y: 2019, lv: 'r2',       t: 'Second Runner-Up — Poetry Prize',         c: 'Korea-Nigeria Poetry Prize (S.S.C)',                    i: 'fa-globe-asia'    },
        /* 2018 */
        { y: 2018, lv: 'finalist', t: 'Finalist',                                c: 'Korea-Nigeria Poetry Prize (S.S.C)',                    i: 'fa-globe-asia'    }
    ];

    var LABELS = {
        overall:  'Overall Award',
        winner:   'Winner',
        r1:       '1st Runner-Up',
        r2:       '2nd Runner-Up',
        finalist: 'Finalist'
    };

    /* ─── BUILD CARDS ─── */
    function buildCards() {
        var grid = document.getElementById('achGrid');
        var html = '';
        for (var i = 0; i < data.length; i++) {
        var a = data[i];
        var isOverall = a.lv === 'overall';
        html += '<div class="ach-card lv-' + a.lv + ' ach-reveal" data-year="' + a.y + '">'
                + (isOverall ? '<div class="ach-shimmer"></div>' : '')
                + '<div class="ach-card-icon"><i class="fas ' + a.i + '"></i></div>'
                + '<span class="ach-badge">' + LABELS[a.lv] + '</span>'
                + '<h4 class="ach-card-title">' + a.t + '</h4>'
                + '<p class="ach-card-comp">' + a.c + '</p>'
                + '<div class="ach-card-year">' + a.y + '</div>'
                + (isOverall ? '<span class="ach-ghost-year">' + a.y + '</span>' : '')
                + '</div>';
        }
        grid.innerHTML = html;
        document.getElementById('achTotalCount').textContent  = data.length;
        document.getElementById('achVisibleCount').textContent = data.length;
    }

    /* ─── FILTER ─── */
    function applyFilter(year) {
        var cards = document.querySelectorAll('.ach-card');
        var i, count = 0;

        /* Quick fade-out pass */
        for (i = 0; i < cards.length; i++) {
        cards[i].classList.add('ach-fading');
        }

        setTimeout(function () {
        for (i = 0; i < cards.length; i++) {
            var c = cards[i];
            c.classList.remove('ach-fading');
            var match = (year === 'all' || c.getAttribute('data-year') === year);
            if (match) {
            c.classList.remove('ach-hidden');
            count++;
            } else {
            c.classList.add('ach-hidden');
            }
        }
        document.getElementById('achVisibleCount').textContent = count;
        }, 230);
    }

    /* ─── SCROLL REVEAL ─── */
    function setupReveal() {
        var cards = document.querySelectorAll('.ach-card.ach-reveal');
        if (!('IntersectionObserver' in window)) {
        /* Fallback for old browsers */
        for (var i = 0; i < cards.length; i++) {
            cards[i].classList.remove('ach-reveal');
            cards[i].classList.add('ach-revealed');
        }
        return;
        }

        var observer = new IntersectionObserver(function (entries) {
        var visible = [];
        for (var j = 0; j < entries.length; j++) {
            if (entries[j].isIntersecting) visible.push(entries[j].target);
        }
        for (var k = 0; k < visible.length; k++) {
            (function (el, delay) {
            setTimeout(function () {
                el.classList.remove('ach-reveal');
                el.classList.add('ach-revealed');
            }, delay);
            })(visible[k], k * 55);
            observer.unobserve(visible[k]);
        }
        }, { threshold: 0.06, rootMargin: '0px 0px -40px 0px' });

        for (var n = 0; n < cards.length; n++) {
        observer.observe(cards[n]);
        }
    }

    /* ─── FILTER BUTTONS ─── */
    function setupFilterButtons() {
        var btns = document.querySelectorAll('#achFilters .ach-filter');
        for (var i = 0; i < btns.length; i++) {
        btns[i].addEventListener('click', function () {
            var active = document.querySelector('#achFilters .ach-filter.active');
            if (active) active.classList.remove('active');
            this.classList.add('active');
            applyFilter(this.getAttribute('data-filter'));
        });
        }
    }

    /* ─── INIT ─── */
    buildCards();
    setupFilterButtons();
    setTimeout(setupReveal, 80); /* slight delay so layout is painted first */

    })();

    // GALLERY CAROUSEL JS
    (function () {

    /* ═══════════════════════════════════════════════
        GALLERY DATA
    ═══════════════════════════════════════════════ */
    var ROW1 = [
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.50.jpeg', caption: 'Award Trophies',                   w: 370 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.56 (1).jpeg',                  caption: 'HIASFEST 2026 — Overall Winners',  w: 490 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.58.jpeg',                            caption: 'Nigeria Teen Authors Prize',        w: 310 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.53 (1).jpeg', caption: 'Lab experiments',                    w: 440 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.47.jpeg',                            caption: 'Spoken Word Performance',          w: 360 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.56.jpeg',                         caption: 'Award Ceremony',                   w: 420 },
        { src: 'images/JMS_img/2026-05-27 at 8.27.04 PM.jpeg',                         caption: 'Powerline Excursion',                   w: 420 },
        { src: 'images/JMS_img/2026-05-27 at 8.32.46 PM.jpeg',                         caption: 'Inter House Sports',                   w: 420 },
    ];

    var ROW2 = [
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.48.jpeg',                             caption: 'Drama & Theatre Arts',             w: 460 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.31.02.jpeg',                     caption: 'ICT Competition - 2026',               w: 320 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.59 (1).jpeg',                           caption: 'Quiz Competition - 2026',            w: 415 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.48 (1).jpeg',                       caption: 'Craft & Innovation - 2022',               w: 355 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.31.07.jpeg',                         caption: 'Trophy cabinet',       w: 485 },
        { src: 'images/JMS_img/WhatsApp Image 2026-05-07 at 15.30.49.jpeg',                              caption: 'ICT Competition - 2025',          w: 370 },
        { src: 'images/JMS_img/2026-05-27 at 8.32.45 PM.jpeg',                              caption: 'Cultural Day',          w: 370 },
        { src: 'images/JMS_img/2026-05-27 at 8.32.31 PM.jpeg',                              caption: 'State Child Ambassador, Benue',          w: 370 },
    ];

    /* ═══════════════════════════════════════════════
        CONFIG
    ═══════════════════════════════════════════════ */
    var GAP          = 10;   /* px between items */
    var BASE_SPEED   = 1.0;  /* px per frame at 1× */
    var SPEED_STEPS  = [0.4, 0.7, 1.0, 1.5, 2.2, 3.2];
    var speedIndex   = 2;    /* start at index 2 = 1.0× */
    var isPaused     = false;
    var isHovering   = false;

    /* ═══════════════════════════════════════════════
        BUILD TRACKS
    ═══════════════════════════════════════════════ */
    function buildTrack(trackEl, items) {
        /* Duplicate array for seamless infinite loop */
        var full = items.concat(items);
        full.forEach(function (item) {
        var el = document.createElement('div');
        el.className = 'jgal-item';
        el.style.width  = item.w + 'px';
        el.style.marginRight = GAP + 'px';

        var img = document.createElement('img');
        img.alt     = item.caption;
        img.loading = 'lazy';
        img.src     = item.src;

        /* Placeholder on error */
        img.onerror = function () {
            var ph = document.createElement('div');
            ph.className = 'jgal-placeholder';
            ph.innerHTML = '<i class="fas fa-image" style="font-size:1.8rem"></i>';
            el.replaceChild(ph, img);
        };

        var cap = document.createElement('span');
        cap.className   = 'jgal-caption';
        cap.textContent = item.caption;

        el.appendChild(img);
        el.appendChild(cap);
        trackEl.appendChild(el);
        });
    }

    var track1 = document.getElementById('jgalTrack1');
    var track2 = document.getElementById('jgalTrack2');

    buildTrack(track1, ROW1);
    buildTrack(track2, ROW2);

    /* ═══════════════════════════════════════════════
        POSITIONS
        half = total width of ONE set (items + gaps),
        which is exactly half of scrollWidth after duplication.
    ═══════════════════════════════════════════════ */
    var half1 = 0;
    var half2 = 0;
    var pos1  = 0;   /* track1 starts at 0, scrolls left (decreasing) */
    var pos2  = 0;   /* track2 starts at -half2, scrolls right (increasing) */
    var ready = false;

    function calcHalves() {
        half1 = track1.scrollWidth / 2;
        half2 = track2.scrollWidth / 2;
        pos2  = -half2; /* track2 begins showing the second copy, moves right */
        ready = true;
    }

    /* Wait for layout paint before measuring */
    requestAnimationFrame(function () {
        requestAnimationFrame(calcHalves);
    });

    /* ═══════════════════════════════════════════════
        ANIMATION LOOP
    ═══════════════════════════════════════════════ */
    function animate() {
        if (ready && !isPaused && !isHovering) {
        var spd = SPEED_STEPS[speedIndex];

        /* Track 1: move left */
        pos1 -= spd;
        if (pos1 <= -half1) pos1 = 0;

        /* Track 2: move right */
        pos2 += spd;
        if (pos2 >= 0) pos2 = -half2;

        track1.style.transform = 'translateX(' + pos1 + 'px)';
        track2.style.transform = 'translateX(' + pos2 + 'px)';
        }
        requestAnimationFrame(animate);
    }

    animate();

    /* ═══════════════════════════════════════════════
        CONTROLS
    ═══════════════════════════════════════════════ */
    var pauseBtn  = document.getElementById('jgalPauseBtn');
    var pauseIcon = document.getElementById('jgalPauseIcon');
    var speedLbl  = document.getElementById('jgalSpeedLabel');

    function updateSpeedLabel() {
        speedLbl.textContent = SPEED_STEPS[speedIndex].toFixed(1).replace('.0', '') + '×';
    }

    pauseBtn.addEventListener('click', function () {
        isPaused = !isPaused;
        pauseIcon.className = isPaused ? 'fas fa-play' : 'fas fa-pause';
        pauseBtn.classList.toggle('jgal-active', isPaused);
    });

    document.getElementById('jgalSlower').addEventListener('click', function () {
        if (speedIndex > 0) {
        speedIndex--;
        updateSpeedLabel();
        }
    });

    document.getElementById('jgalFaster').addEventListener('click', function () {
        if (speedIndex < SPEED_STEPS.length - 1) {
        speedIndex++;
        updateSpeedLabel();
        }
    });

    /* ── Hover pause ── */
    var section = document.getElementById('jgal-section');

    section.addEventListener('mouseenter', function () {
        isHovering = true;
    });
    section.addEventListener('mouseleave', function () {
        isHovering = false;
    });

    /* ── Touch: swipe to nudge speed ── */
    var touchStartX = 0;
    section.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        isHovering  = true;
    }, { passive: true });

    section.addEventListener('touchend', function (e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 40) {
        /* Swipe right = slow down, swipe left = speed up */
        if (dx > 0 && speedIndex > 0)                      speedIndex--;
        if (dx < 0 && speedIndex < SPEED_STEPS.length - 1) speedIndex++;
        updateSpeedLabel();
        }
        isHovering = false;
    }, { passive: true });

    })();

});