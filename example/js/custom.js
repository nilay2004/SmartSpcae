$(document).ready(function() {
    // Dark mode toggle with smooth transition
    var darkModeSwitch = document.getElementById('dark-mode-switch');
    var body = document.body;

    // Restore dark mode preference
    if (localStorage.getItem('dark-mode') === 'true') {
        body.classList.add('dark-mode');
        darkModeSwitch.checked = true;
    }

    darkModeSwitch.addEventListener('change', function() {
        body.classList.toggle('dark-mode', darkModeSwitch.checked);
        localStorage.setItem('dark-mode', darkModeSwitch.checked);
    });

    // Staggered fade-in for item cards when Add Items panel becomes visible
    var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                var target = mutation.target;
                if (target.id === 'add-items' && target.style.display !== 'none') {
                    animateItemsIn();
                }
            }
        });
    });

    var addItemsEl = document.getElementById('add-items');
    if (addItemsEl) {
        observer.observe(addItemsEl, { attributes: true });
    }

    function animateItemsIn() {
        var items = document.querySelectorAll('#items-wrapper .add-item');
        items.forEach(function(item, index) {
            item.style.opacity = '0';
            item.style.transform = 'translateY(12px)';
            setTimeout(function() {
                item.style.transition = 'opacity 250ms ease, transform 250ms ease';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            }, index * 25);
        });
    }

    // Smooth slide animation for sidebar panels
    $('.panel-heading').on('click', function() {
        var panelBody = $(this).next('.panel-collapse');
        if (panelBody.length) {
            $('.panel-collapse').not(panelBody).slideUp(250);
            panelBody.slideToggle(250);
        }
    });

    // Active navigation indicator
    $('.nav-sidebar > li > a').on('click', function() {
        // The active class is managed by example.js SideMenu,
        // but we add a subtle click feedback
        $(this).css('transform', 'scale(0.97)');
        var el = $(this);
        setTimeout(function() {
            el.css('transform', '');
        }, 100);
    });

    // Keyboard shortcut hint (Ctrl+S to save)
    $(document).on('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            $('#saveFile').click();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            $('#new').click();
        }
    });
});
