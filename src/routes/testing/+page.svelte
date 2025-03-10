<script>
	let count = $state(0);
	const createCountDisplay = () => {
		console.log('rendering');
		return `Count: ${count}`;
	};
</script>

<div class="z-10 grow">
	<p>{createCountDisplay()}</p>
	<button onclick={() => count++}>Increment</button>
</div>
