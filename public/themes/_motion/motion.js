/* AlwaysBro motion layer. Pure JavaScript, no dependencies. Safe to include on any page. */
(function () {
	var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	var doc = document.documentElement;
	doc.classList.add('mo-on');

	var REVEAL = 'section h1,section h2,section h3,section p,section .card,section .btn,section img,section .row > *,section li,header h1,header h2,header p,header .btn,footer .row > *';
	var SKIP = '.navbar,.modal,[data-mo-skip]';

	function mark() {
		var groups = new Map();
		document.querySelectorAll(REVEAL).forEach(function (el) {
			if (el.closest(SKIP) || el.classList.contains('mo-reveal')) return;
			var parent = el.parentElement;
			var n = groups.get(parent) || 0;
			groups.set(parent, n + 1);
			el.classList.add('mo-reveal');
			el.style.setProperty('--mo-delay', Math.min(n, 6) * 90 + 'ms');
			if (el.matches('.row > *')) el.classList.add(n % 2 ? 'mo-right' : 'mo-left');
		});
	}

	function watch() {
		if (!('IntersectionObserver' in window)) {
			document.querySelectorAll('.mo-reveal').forEach(function (el) { el.classList.add('mo-in'); });
			return;
		}
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (e.isIntersecting) { e.target.classList.add('mo-in'); io.unobserve(e.target); }
			});
		}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
		document.querySelectorAll('.mo-reveal').forEach(function (el) { io.observe(el); });
	}

	function lift() {
		if (reduce || !window.matchMedia('(hover:hover)').matches) return;
		document.querySelectorAll('.card,.portfolio-item,.service-box,.team-member').forEach(function (el) {
			el.classList.add('mo-lift');
			el.addEventListener('pointermove', function (ev) {
				var r = el.getBoundingClientRect();
				var x = (ev.clientX - r.left) / r.width - 0.5;
				var y = (ev.clientY - r.top) / r.height - 0.5;
				el.style.transform = 'perspective(900px) rotateX(' + (-y * 6).toFixed(2) + 'deg) rotateY(' + (x * 8).toFixed(2) + 'deg) translateY(-4px)';
			});
			el.addEventListener('pointerleave', function () { el.style.transform = ''; });
		});
	}

	function scrollFx() {
		var bar = document.createElement('div');
		bar.className = 'mo-bar';
		document.body.appendChild(bar);
		var hero = document.querySelector('header.masthead,header,.masthead');
		var ticking = false;
		function update() {
			ticking = false;
			var max = doc.scrollHeight - window.innerHeight;
			bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ')';
			if (hero && !reduce) {
				var y = Math.min(window.scrollY, window.innerHeight * 1.2);
				hero.classList.add('mo-hero');
				hero.style.backgroundPositionY = 'calc(50% + ' + (y * 0.35).toFixed(1) + 'px)';
				var inner = hero.querySelector('.container,.container-fluid,.masthead-content');
				if (inner) {
					inner.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
					inner.style.opacity = String(Math.max(0, 1 - y / (window.innerHeight * 0.9)));
				}
			}
		}
		window.addEventListener('scroll', function () {
			if (!ticking) { ticking = true; requestAnimationFrame(update); }
		}, { passive: true });
		update();
	}

	function glow() {
		if (reduce || !window.matchMedia('(hover:hover)').matches) return;
		var g = document.createElement('div');
		g.className = 'mo-glow';
		document.body.appendChild(g);
		window.addEventListener('pointermove', function (ev) {
			g.style.left = ev.clientX + 'px';
			g.style.top = ev.clientY + 'px';
			g.classList.add('mo-live');
		}, { passive: true });
	}

	function init() {
		mark();
		watch();
		lift();
		scrollFx();
		glow();
		document.querySelectorAll('header img,.masthead img').forEach(function (img) { img.classList.add('mo-float'); });
	}

	if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
	else init();
})();
