<script lang="ts">
	import ColorPicker from 'svelte-awesome-color-picker';
	import { Archive, Copy, Download } from '@lucide/svelte';
	import { getSvgPath } from 'figma-squircle';
	import { displaySvgD3 } from './displaySvgD3';
	import JSZip from 'jszip';

	let bgColorHex = $state<string>('#000000');
	let borderRadius = $state<number>(100);
	let imageWidth = $state<number>(75);
	let svgElement = $state<SVGElement | null>(null);
	let svgElements = $state<SVGElement[]>([]);
	let imageRotation = $state<number>(0);
	let selectedIndex = $state<string>('');

	const parseSvgContent = (svgContent: string) => {
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgContent, 'image/svg+xml');
		return doc.documentElement as unknown as SVGElement;
	};

	$effect(() => {
		const handleGlobalPaste = async (event: ClipboardEvent) => {
			const clipboardData = event.clipboardData;
			if (!clipboardData) return;

			// First try to get SVG directly
			if (clipboardData.types.includes('image/svg+xml')) {
				try {
					const svgData = clipboardData.getData('image/svg+xml');
					if (svgData) {
						svgElement = parseSvgContent(svgData);
						return;
					}
				} catch (error) {
					console.error('Error getting SVG data:', error);
				}
			}

			// Try to get SVG from clipboard items
			const items = clipboardData.items;

			for (let i = 0; i < items.length; i++) {
				const item = items[i];

				// Check for SVG file or image
				if (item.type === 'image/svg+xml') {
					const blob = item.getAsFile();
					if (blob) {
						// Parse SVG content
						const text = await blob.text();
						svgElement = parseSvgContent(text);
						return;
					}
				}
			}

			// Check for SVG text content
			const text = clipboardData.getData('text/plain');
			if (text) {
				const trimmedText = text.trim();

				if (trimmedText.startsWith('<svg') && trimmedText.includes('</svg>')) {
					svgElement = parseSvgContent(text);
					return;
				}

				// Check if the text is a URL to an SVG file
				if (trimmedText.match(/^https?:\/\/.*\.svg$/i)) {
					try {
						const response = await fetch(trimmedText);
						if (response.ok) {
							const svgText = await response.text();
							if (svgText.trim().startsWith('<svg')) {
								svgElement = parseSvgContent(svgText);
								return;
							}
						}
					} catch (error) {
						console.error('Error fetching SVG from URL:', error);
					}
				}
			}
		};

		document.addEventListener('paste', handleGlobalPaste);

		return () => {
			document.removeEventListener('paste', handleGlobalPaste);
		};
	});

	const handleFileUpload = (
		event: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) => {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (!files || files.length === 0) return;
		const filePromises = Array.from(files).map((file) => {
  		if (file && file.type === 'image/svg+xml') {
		    return file.text()
		      .then((text) => {
		    	const parser = new DOMParser();
		        const doc = parser.parseFromString(text, 'image/svg+xml');
		        return doc.documentElement;
		      })
		      .catch((error) => {
		        console.error("Error processing file:", file.name, error);
		        alert('Error processing file: ' + file.name);
		        return null;
		      });
		  } else {
		    alert('Please upload an SVG file: ' + file.name);
		    target.value = '';
		    return null;
		  }
		}).filter(Boolean);

		Promise.all(filePromises)
		  .then((elements) => {
		    const validSvgElements = elements.filter(Boolean);
		    if (validSvgElements.length > 0) {
				svgElements.push(...validSvgElements);
			    svgElement = validSvgElements[0];
			    selectedIndex = '0';
		    } else {
				svgElement = null;
			    selectedIndex = null;
		    }
		  })
		  .catch((error) => {
		    	console.error("Error in Promise.all:", error);
		    	alert("An error occurred while processing the files.");
		  });
	};

	const createSvgWithBackground = (svgImage: SVGElement) => {
		if (!svgImage) return null;

		const size = 400;

		const newSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		newSvg.setAttribute('width', String(size));
		newSvg.setAttribute('height', String(size));
		newSvg.setAttribute('viewBox', `0 0 ${size} ${size}`);

		const svgPath = getSvgPath({
			width: size,
			height: size,
			cornerRadius: borderRadius,
			cornerSmoothing: 0.8,
			preserveSmoothing: true
		});

		const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		path.setAttribute('d', svgPath);
		path.setAttribute('fill', bgColorHex);
		newSvg.appendChild(path);

		const originalViewBox = svgImage.getAttribute('viewBox')?.split(' ').map(Number) || [
			0, 0, 100, 100
		];
		const originalWidth = originalViewBox[2];
		const originalHeight = originalViewBox[3];

		// Calculate scale factor based on image width percentage
		const scaleFactor = imageWidth / 100;

		// Determine the appropriate scale to maintain aspect ratio
		// and fit within the container while respecting the imageWidth setting
		const aspectRatio = originalWidth / originalHeight;
		let scaleX, scaleY;

		if (aspectRatio >= 1) {
			// Wider than tall
			scaleX = (size * scaleFactor) / originalWidth;
			scaleY = scaleX; // Maintain aspect ratio
		} else {
			// Taller than wide
			scaleY = (size * scaleFactor) / originalHeight;
			scaleX = scaleY; // Maintain aspect ratio
		}

		// Calculate the scaled dimensions
		const scaledWidth = originalWidth * scaleX;
		const scaledHeight = originalHeight * scaleY;

		// Center of the content after scaling
		const centerX = (scaledWidth / 2);
		const centerY = (scaledHeight / 2);

		// Center the SVG in the background
		const xOffset = (size - scaledWidth) / 2;
		const yOffset = (size - scaledHeight) / 2;

		// Add the original SVG content in a group with transform
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		g.setAttribute('transform', `translate(${xOffset}, ${yOffset}) rotate(${imageRotation}, ${centerX}, ${centerY}) scale(${scaleX}, ${scaleY})`);
		g.innerHTML = svgImage.innerHTML;
		newSvg.appendChild(g);

		const serializer = new XMLSerializer();
		return serializer.serializeToString(newSvg);
	};

	const copySvgWithBackground = async () => {
		if (!svgElement) {
			alert('No SVG selected');
			return;
		}
		const svgString = await createSvgWithBackground(svgElement);
		if (!svgString) {
			alert('Failed to copy SVG');
			return;
		}

		try {
			await navigator.clipboard.writeText(svgString);
			alert('SVG copied to clipboard!');
		} catch (error) {
			console.error('Error copying SVG:', error);
			alert('Failed to copy SVG');
		}
	};

	function handleSelect(event: Event) {
		const target = event.target as HTMLSelectElement;
		const index = target.value;
		svgElement = index === '' ? null : svgElements[parseInt(index, 10)];
		selectedIndex = index;
	}

	function clampAngle() {
		//handles typing multiple characters in the input fields
		if (typeof imageRotation !== 'number' || isNaN(imageRotation)) {
			imageRotation = 0;
		}

		if (imageRotation > 360) {
			imageRotation = 360;
		} else if (imageRotation < 0) {
			imageRotation = 0;
		}
	}

	const downloadSvgWithBackground = async () => {
		if (!svgElement) {
			alert('No SVG selected');
			return;
		}
		const svgString = await createSvgWithBackground(svgElement);
		if (!svgString) {
			alert('Failed to download SVG');
			return;
		}

		try {
			const blob = new Blob([svgString], { type: 'image/svg+xml' });
			const url = URL.createObjectURL(blob);

			const a = document.createElement('a');
			a.href = url;
			a.download = 'svg-with-background.svg';
			document.body.appendChild(a);
			a.click();

			// Clean up
			setTimeout(() => {
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}, 100);
		} catch (error) {
			console.error('Error downloading SVG:', error);
			alert('Failed to download SVG');
		}
	};

	const downloadAllSVGsAsZip = async () => {
		if (svgElements.length === 0) {
			alert('No SVGs uploaded');
			return;
		}
		const zip = new JSZip();
		svgElements.forEach((svg, index) => {
			const svgString = createSvgWithBackground(svg);
			if (!svgString) {
				alert('Failed to download SVGs');
				return;
			}
			zip.file(`svg-with-background-${index + 1}.svg`, svgString);
		});

		try {
			const content = await zip.generateAsync({ type: 'blob' });
			const url = URL.createObjectURL(content);

			const a = document.createElement('a');
			a.href = url;
			a.download = 'svgs-with-background.zip';
			document.body.appendChild(a);
			a.click();

			// Clean up
			setTimeout(() => {
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}, 100);
		} catch (error) {
			console.error('Error downloading SVGs:', error);
			alert('Failed to download SVGs');
		}
	};

	const applyChangesToAllSVG = async () => {
		if (svgElements.length === 0) return;
		svgElements.forEach((svg, index) => {
			const svgString = createSvgWithBackground(svg);
			if (!svgString) {
				alert('Failed to apply changes to SVGs');
				return;
			}
		});
		alert('Style applied to all SVGs');
	};
	let svgDisplay: HTMLDivElement;

	const { setupSvg, updateSvg, setInnerSvg } = displaySvgD3();

	$effect(() => {
		setupSvg(svgDisplay);
	});

	$effect(() => {
		updateSvg({ borderRadius: borderRadius, bgColorHex: bgColorHex });
	});

	$effect(() => {
		if (svgElement) {
			setInnerSvg({ svgElement: svgElement, imageWidth: imageWidth, imageRotation: imageRotation });
		}
	});
</script>

<svelte:head>
	<title>Quick SVG Background</title>
	<meta name="description" content="Quickly add a background to your SVGs" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
</svelte:head>

<main class="flex grow flex-col items-center justify-center p-8">
	<h1 class="pb-4 text-2xl font-bold dark:text-white">Quick SVG Background</h1>
	<p class="pb-8 text-center text-sm text-gray-600 dark:text-gray-300">
		Quickly add a background to your svg. All client side, for free.
	</p>

	<!-- <div class="mb-5">
		<label class="mb-5 ml-20 flex flex-col items-center justify-center">
			<input
				type="file"
				accept=".svg"
				onchange={(e) => handleFileUpload(e)}
				class="block w-full text-sm text-slate-500 file:mr-4
          file:rounded-md file:border-0 file:bg-orange-50
          file:px-4 file:py-2
          file:text-sm file:font-semibold
          file:text-orange-700 hover:file:bg-orange-100
          dark:text-slate-300
          dark:file:bg-orange-900/50 dark:file:text-orange-300
          dark:hover:file:bg-orange-900/70"
			/>
		</label>
		<p class="mt-2 text-sm text-gray-600 dark:text-gray-300">
			Or press Cmd+V / Ctrl+V anywhere on the page to paste an SVG
		</p>
	</div> -->

	<div class="mb-10 flex w-full flex-col items-center justify-center">
		<label class="my-10 ml-20 flex cursor-pointer flex-col items-center justify-center">
			<input
				multiple
				type="file"
				accept=".svg"
				onchange={(e) => handleFileUpload(e)}
				class="mx-auto block text-sm
			text-slate-500 file:mr-4 file:rounded-md
			file:border-0 file:bg-orange-50
			file:px-4 file:py-2
			file:text-sm file:font-semibold
			file:text-orange-700 hover:file:bg-orange-100"
			/>
		</label>
		<p class="text-md text-center text-gray-800">
			Add multiple SVGs to edit one by one or apply edits to all SVGs at once
		</p>
	</div>

	<div class="flex items-center justify-center">
		<div bind:this={svgDisplay}></div>
	</div>

	<div class="mt-10 flex items-center gap-3">
		<button
			class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:cursor-pointer
				       dark:border-gray-600
				       {bgColorHex === '#ffffff'
				? 'bg-orange-500 text-white'
				: 'bg-white text-gray-800 hover:bg-gray-100 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700'}"
			onclick={() => (bgColorHex = '#ffffff')}
		>
			White
		</button>
		<button
			class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium transition-colors hover:cursor-pointer
				       dark:border-gray-600
				       {bgColorHex === '#000000'
				? 'bg-orange-500 text-white'
				: 'bg-black text-white hover:bg-gray-800 dark:bg-gray-900 dark:hover:bg-gray-800'}"
			onclick={() => (bgColorHex = '#000000')}
		>
			Black
		</button>
		<div class="rounded-md border border-gray-300 bg-white px-2 py-1 dark:border-gray-600">
			<ColorPicker bind:hex={bgColorHex} position="responsive" />
		</div>
	</div>

	<div class="mt-10 flex w-[400px] gap-x-5 flex-row items-center justify-center">
			<select
				id="svgDropdown"
				class="text-md w-3/5 rounded border px-3 py-3"
				onchange={handleSelect}
				bind:value={selectedIndex}
			>
				<option value='' disabled>No SVG selected</option>

				{#each svgElements as _, index}
					<option value={index.toString()}>SVG {index + 1}</option>
				{/each}
			</select>
			<button
				class="text-md flex w-2/5 py-3 flex-row items-center justify-center rounded-md bg-orange-600 font-bold text-white transition-colors hover:cursor-pointer hover:bg-orange-700"
				onclick={applyChangesToAllSVG}
			>
				<span class="block text-right max-sm:hidden">Apply to all</span>
			</button>
	</div>

	<div class="mt-10 w-full max-w-[400px]">
		<div class="flex items-center justify-between">
			<span class="text-sm text-gray-600 dark:text-gray-300">Border Radius: {borderRadius}px</span>
			<input
				type="range"
				min="0"
				max="200"
				bind:value={borderRadius}
				class="w-full accent-orange-500"
			/>
		</div>
	</div>

	<div class="mt-4 w-full max-w-[400px]">
		<div class="flex items-center justify-between">
			<span class="text-sm text-gray-600 dark:text-gray-300">Image Width: {imageWidth}%</span>
			<input
				type="range"
				min="10"
				max="100"
				bind:value={imageWidth}
				class="mx-auto w-85 accent-orange-500"
			/>
		</div>
	</div>

	<div class="mt-4 flex w-full max-w-[400px] flex-row items-center justify-between">
		<div class="flex flex-col items-start">
			<span class="px-2 text-sm text-gray-600">Rotation (°): </span>
			<span class="px-2 text-sm text-gray-600">{imageRotation}° </span>
		</div>
		<input
			type="number"
			min="0"
			max="360"
			bind:value={imageRotation}
			oninput={clampAngle}
			class="w-73 rounded-md border-2 border-orange-600 py-2 text-right text-sm font-medium  transition-colors hover:cursor-pointer"
		/>
	</div>

	<div class="mt-10 flex w-full flex-row items-center justify-center gap-4">
		<button
			class="flex items-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
			onclick={copySvgWithBackground}
		>
			<Copy class="h-5 w-5" strokeWidth={3} />
			<span class="ml-2 block max-sm:hidden">Copy SVG</span>
		</button>
		<button
			class="flex items-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
			onclick={downloadSvgWithBackground}
		>
			<Download class="h-5 w-5" strokeWidth={3} />
			<span class="ml-2 block max-sm:hidden">Download this SVG</span>
		</button>
		<button
			class="flex items-center rounded-md bg-orange-600 px-4 py-3 text-lg font-medium text-white transition-colors hover:cursor-pointer hover:bg-orange-700"
			onclick={downloadAllSVGsAsZip}
		>
			<Archive class="h-5 w-5" strokeWidth={3} />
			<span class="ml-2 block max-sm:hidden">Download all SVGs</span>
		</button>
	</div>
</main>
