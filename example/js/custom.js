$(document).ready(function() {
    // Dark mode toggle
    const darkModeSwitch = document.getElementById('dark-mode-switch');
    const body = document.body;

    if (localStorage.getItem('dark-mode') === 'true') {
        body.classList.add('dark-mode');
        darkModeSwitch.checked = true;
    }

    darkModeSwitch.addEventListener('change', () => {
        body.classList.toggle('dark-mode');
        localStorage.setItem('dark-mode', darkModeSwitch.checked);
    });

    // Smooth scrolling for panel clicks
    $('.panel-heading a').on('click', function(e) {
        if (this.hash !== '') {
            e.preventDefault();
            var hash = this.hash;
            $('html, body').animate({
                scrollTop: $(hash).offset().top
            }, 800, function(){
                window.location.hash = hash;
            });
        }
    });

    // Fade in effect for thumbnails
    $('.thumbnail').each(function(i) {
        $(this).delay(100 * i).fadeIn(300);
    });

    // Panel slide animation
    $('.panel-heading').on('click', function() {
        var panelBody = $(this).next('.panel-collapse');
        $('.panel-collapse').not(panelBody).slideUp(300);
        panelBody.slideToggle(300);
    });
});
