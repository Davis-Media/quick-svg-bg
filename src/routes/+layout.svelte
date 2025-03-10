<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="font-geist relative flex min-h-screen w-screen flex-col overflow-hidden bg-neutral-100">
	<div
		class="absolute top-0 left-0 z-0 h-full w-32 bg-contain bg-left bg-no-repeat opacity-70 md:w-40 lg:w-56"
		style="background-image: url('/images/left-splash.svg')"
	></div>

	<div
		class="absolute top-0 right-0 z-0 h-full w-32 bg-contain bg-right bg-no-repeat opacity-70 md:w-40 lg:w-56"
		style="background-image: url('/images/right-splash.svg')"
	></div>

	{@render children()}

	<footer class="flex justify-center p-4 text-sm text-gray-500">
		<p>
			<a
				href="https://github.com/bmdavis419/quick-svg-bg"
				target="_blank"
				class="hover:cursor-pointer hover:underline">github</a
			>
		</p>
	</footer>
</div>
