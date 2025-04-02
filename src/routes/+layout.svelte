<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';
	import '../app.css';
	let { children } = $props();

	let isDark = $state(false);

	function toggleDarkMode() {
		isDark = !isDark;
		if (isDark) {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}

	let isEven = (num: number) => {
		return num % 2 !== 0;
	};

	$inspect(isEven(1));
</script>

<div
	class="font-geist relative flex min-h-screen w-screen flex-col overflow-hidden bg-neutral-100 dark:bg-neutral-900"
>
	<div
		class="absolute top-0 left-0 z-0 h-full w-32 bg-contain bg-left bg-no-repeat opacity-70 md:w-40 lg:w-56"
		style="background-image: url('/images/left-splash.svg')"
	></div>

	<div
		class="absolute top-0 right-0 z-0 h-full w-32 bg-contain bg-right bg-no-repeat opacity-70 md:w-40 lg:w-56"
		style="background-image: url('/images/right-splash.svg')"
	></div>

	<div class="fixed top-4 left-4 z-10">
		<button
			onclick={toggleDarkMode}
			class="rounded-full p-2 hover:cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800"
		>
			<Sun class="h-5 w-5 dark:hidden" />
			<Moon class="hidden h-5 w-5 dark:block dark:text-white" />
		</button>
	</div>

	{@render children()}

	<footer class="flex justify-center p-4 text-sm text-gray-500 dark:text-gray-400">
		<p>
			<a
				href="https://github.com/Davis-Media/quick-svg-bg"
				target="_blank"
				class="hover:cursor-pointer hover:underline">github</a
			>
		</p>
	</footer>
</div>
