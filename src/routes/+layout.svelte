<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';
	import '../app.css';
	let { children } = $props();
	import { injectAnalytics } from '@vercel/analytics/sveltekit';
	import { dev } from '$app/environment';

	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let isDark = $state(true);

	function toggleDarkMode() {
		isDark = !isDark;
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}
</script>

<div
	class="font-geist relative flex min-h-screen w-full flex-col overflow-hidden bg-[var(--color-surface-muted)] text-[color:var(--color-text-primary)] transition-colors duration-300"
>
	<div class="pointer-events-none absolute inset-0">
		<div
			class="absolute top-[-20%] left-[-15%] h-96 w-96 rounded-full bg-[var(--color-primary-soft)] blur-3xl"
		></div>
		<div
			class="absolute right-[-20%] bottom-[-25%] h-[28rem] w-[28rem] rounded-full bg-[var(--color-primary-soft)] blur-3xl"
		></div>
	</div>

	<div
		class="absolute inset-y-0 left-0 z-0 hidden w-48 bg-contain bg-left bg-no-repeat opacity-30 xl:block dark:opacity-40"
		style="background-image: url('/images/left-splash.svg')"
	></div>

	<div
		class="absolute inset-y-0 right-0 z-0 hidden w-48 bg-contain bg-right bg-no-repeat opacity-30 xl:block dark:opacity-40"
		style="background-image: url('/images/right-splash.svg')"
	></div>

	<header
		class="relative z-20 border-b border-[color:var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur"
	>
		<div
			class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8"
		>
			<div class="flex items-baseline gap-3">
				<span
					class="inline-flex items-center rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold tracking-[0.3em] text-[color:var(--color-primary-strong)] uppercase"
					>Quick</span
				>
				<p class="text-lg font-semibold text-[color:var(--color-text-primary)] sm:text-xl">
					SVG Background Studio
				</p>
			</div>
			<button
				onclick={toggleDarkMode}
				class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[var(--color-surface)] text-[color:var(--color-text-primary)] transition hover:border-[var(--color-primary)] hover:text-[color:var(--color-primary-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
				aria-label="Toggle theme"
			>
				<Sun class="h-5 w-5 dark:hidden" />
				<Moon class="hidden h-5 w-5 dark:block" />
			</button>
		</div>
	</header>

	<div class="relative z-10 flex grow flex-col">
		<div class="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
			{@render children()}
		</div>
	</div>

	<footer
		class="relative z-10 border-t border-[color:var(--color-border)] bg-[var(--color-surface)]/90"
	>
		<div
			class="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-6 text-xs text-[color:var(--color-text-secondary)] sm:px-6 lg:px-8"
		>
			<p>Need the code? It's on GitHub.</p>
			<a
				href="https://github.com/Davis-Media/quick-svg-bg"
				target="_blank"
				class="font-medium text-[color:var(--color-primary-strong)] underline-offset-4 transition hover:text-[color:var(--color-primary)] hover:underline"
				>github.com/Davis-Media/quick-svg-bg</a
			>
		</div>
	</footer>
</div>
