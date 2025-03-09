<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="relative flex min-h-screen w-screen overflow-hidden">
	<div
		class="absolute top-0 left-0 z-0 h-full w-32 bg-contain bg-left bg-no-repeat opacity-70 md:w-40 lg:w-56"
		style="background-image: url('/images/left-splash.svg')"
	></div>

	<div
		class="absolute top-0 right-0 z-0 h-full w-32 bg-contain bg-right bg-no-repeat opacity-70 md:w-40 lg:w-56"
		style="background-image: url('/images/right-splash.svg')"
	></div>

	{@render children()}
</div>
