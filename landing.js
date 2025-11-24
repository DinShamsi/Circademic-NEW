// Mobile menu toggle
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuToggle.classList.toggle('active');
    });
}

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Contact form handler
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Show success message
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed;
            top: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: #10b981;
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            font-weight: 600;
            z-index: 9999;
            animation: slideDown 0.3s ease;
        `;
        message.textContent = 'ההודעה נשלחה בהצלחה! ניצור איתך קשר בקרוב.';
        document.body.appendChild(message);
        
        // Reset form
        contactForm.reset();
        
        // Remove message after 3 seconds
        setTimeout(() => {
            message.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => message.remove(), 300);
        }, 3000);
    });
}

// Intersection Observer for animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card, .step').forEach((el, index) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = `all 0.5s ease ${index * 0.1}s`;
    observer.observe(el);
});

// Scroll effect for nav
let lastScroll = 0;
const nav = document.querySelector('.nav');

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > lastScroll && currentScroll > 100) {
        nav.style.transform = 'translateY(-100%)';
    } else {
        nav.style.transform = 'translateY(0)';
    }
    
    lastScroll = currentScroll;
});

// Add animation styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
        to {
            opacity: 1;
            transform: translate(-50%, 0);
        }
    }
    
    @keyframes slideUp {
        from {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        to {
            opacity: 0;
            transform: translate(-50%, -20px);
        }
    }
    
    .nav {
        transition: transform 0.3s ease;
    }
    
    .nav-links.active {
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--light-bg);
        width: 100%;
        padding: 1rem;
        box-shadow: 0 10px 30px var(--shadow-lg);
    }
    
    @media (min-width: 769px) {
        .nav-links.active {
            display: flex !important;
            position: static;
            flex-direction: row;
            width: auto;
            padding: 0;
            box-shadow: none;
        }
    }
`;
document.head.appendChild(style);
