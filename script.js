// Global variables ------------------------------------------------------------
let pokemonList = [];
let activeFilters = {
	location: "",
	time: "",
	type: "",
	variant: ""
};
let counterMode = "count";
let showCaught = true;
let caughtPokemon = 0
let totalPokemon = 0

// DOM elements ----------------------------------------------------------------
const pokedex = document.getElementById("pokedex");
const textarea = document.getElementById("import-export-textarea");
const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const settingsMenu = document.getElementById("settings-menu");
const settingsOverlay = document.getElementById("settings-overlay");

// Managing the Filter dropdowns -------------------------------------------------------------
/**
 * Creates a debounced function that delays invoking the provided function 
 * until after the specified delay in milliseconds has passed since the last 
 * time the debounced function was invoked.
 * 
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The number of milliseconds to delay.
 * @returns {Function} - Returns the new debounced function.
 */
const debounce = (func, delay) => {
	let debounceTimer; // Timer ID for maintaining the delay
	return function() {
		const context = this;
		const args = arguments;
		clearTimeout(debounceTimer); // Clear any existing timer
		// Set a new timer to execute the function after the delay
		debounceTimer = setTimeout(() => func.apply(context, args), delay);
	}
};

/**
 * Adds event listeners to the specified filter element that updates the active filters
 * object with the selected value when the selection changes. The filterPokemon() function
 * is called with a 300ms debounce to ensure multiple filters are respected.
 * 
 * @param {HTMLElement} filterElement - The select element for the filter.
 * @param {string} filterType - The type of filter (e.g. "location", "time", "type", "variant").
 */
const addFilterEventListeners = (filterElement, filterType) => {
	filterElement.addEventListener("change", debounce(() => {
		activeFilters[filterType] = filterElement.value;
		filterPokemon();
	}, 300));
};

// Add event listeners to all filter elements
["location", "time", "type", "variant"].forEach(filterType => {
	filterElement = document.getElementById(`${filterType}Filter`);
	addFilterEventListeners(filterElement, filterType);
});

/**
 * Populates the dropdown filters for time, type, and variant.
 */
const populateFilterDropdowns = () => {
	// Populate time filter options
	timeFilter.innerHTML = `
        <option value="">All</option>
        <option value="Day">Day</option>
        <option value="Night">Night</option>
    `;

	// Populate type filter options
	typeFilter.innerHTML = `
        <option value="">All</option>
        <option value="Land">Land</option>
        <option value="Water">Water</option>
    `;

	// Populate variant filter options
	variantFilter.innerHTML = `
        <option value="">All</option>
        <option value="Normal">Normal</option>
        <option value="Shiny">Shiny</option>
        <option value="Dark">Dark</option>
        <option value="Mystic">Mystic</option>
        <option value="Metallic">Metallic</option>
        <option value="Shadow">Shadow</option>
    `;
};

/**
 * Populates the location filter dropdown with all unique location names from the
 * loaded Pokémon data. The locations are sorted alphabetically, with Route locations
 * sorted numerically.
 */
const populateLocationFilter = () => {
	const allLocations = new Set();
	pokemonList.forEach(pokemon => {
		pokemon.locations.forEach(location => allLocations.add(location.place));
	});

	// Sort the locations alphabetically, with Route locations sorted numerically
	const sortedLocations = sortLocations([...allLocations], /^Route \d+$/i);

	// Create the options for the location filter dropdown
	const options = [
		`<option value="">No Route Selected</option>`,
		...sortedLocations.map(location => `<option value="${location}">${location}</option>`),
	];

	// Set the innerHTML of the location filter element to the options
	locationFilter.innerHTML = options.join("");
};

/**
 * Returns true if the given Pokémon matches all active filters (location, time, type).
 * @param {Object} pokemon - The Pokémon to filter.
 * @returns {boolean} - True if the Pokémon matches all active filters.
 */
const tripleFilter = (pokemon) => {
	return pokemon.locations.some((location) => {
		// Check if the location matches the active location filter
		const matchesLocation = activeFilters.location ? location.place === activeFilters.location : true;
		// Check if the time matches the active time filter
		const matchesTime = activeFilters.time ? location.time === activeFilters.time : true;
		// Check if the type matches the active type filter
		const matchesType = activeFilters.type ? location.type === activeFilters.type : true;
		// Return true if all filters match
		return matchesLocation && matchesTime && matchesType;
	});
};

/**
 * Sorts a list of location strings into those that match a given regular expression
 * and those that do not. The locations that belong to a Route are sorted numerically by any
 * number present in the string, while named locations are sorted alphabetically.
 * 
 * @param {Array} locations - The list of location strings to be sorted.
 * @param {RegExp} regex - The regular expression to test against each location.
 * @returns {Array} - A sorted array of locations, with matching locations first.
 */
const sortLocations = (locations, regex) => {
	const matching = [];
	const nonMatching = [];

	// Separate locations into matching and non-matching based on the regex
	locations.forEach((location) => {
		if (regex.test(location)) {
			matching.push(location);
		} else {
			nonMatching.push(location);
		}
	});

	// Sort matching locations numerically based on numbers in the string
	matching.sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));

	// Sort non-matching locations alphabetically
	nonMatching.sort();

	// Combine the sorted matching and non-matching locations
	return [...matching, ...nonMatching];
};

//Save Data Management -------------------------------------------------------------
/**
 * Loads Pokémon data from local storage or fetches it from an external JSON file.
 * Updates the Pokémon counter and applies filters after loading.
 */
const loadPokemon = async () => {
	try {
		// Attempt to retrieve saved Pokémon data from local storage
		const savedData = localStorage.getItem("pokedex");

		if (savedData) {
			// Parse and assign saved data to pokemonList if available
			pokemonList = JSON.parse(savedData);
		} else {
			// Fetch Pokémon data from external JSON file if not in local storage
			const response = await fetch("pokemon_list.json");
			if (!response.ok) throw new Error("Failed to load Pokémon data.");

			// Parse and assign fetched data to pokemonList
			pokemonList = await response.json();

			// Save fetched data to local storage for future use
			localStorage.setItem("pokedex", JSON.stringify(pokemonList));
		}

		// Update the Pokémon counter and apply filters to the list
		updatePokemonCounter();
		filterPokemon();
	} catch (error) {
		// Log error and display error message on the page if there is an issue
		console.error("Error loading Pokémon data:", error);
		pokedex.innerHTML = `<p>Error loading Pokémon data: ${error.message}</p>`;
	}
};

/**
 * Clears the user's progress by removing it from local storage and reloading the
 * Pokémon data. Prompts the user for confirmation before performing the action.
 */
const clearProgress = () => {
	const confirmation = window.confirm(
		"Are you sure you want to clear your progress? This action cannot be undone."
	);
	if (confirmation) {
		// Remove the saved progress from local storage
		localStorage.removeItem("pokedex");

		// Reload the Pokémon data
		loadPokemon();
	}
};

/**
 * Saves the current progress to local storage.
 * This function is called whenever the user's caught status changes.
 */
const saveProgress = () => {
	// Save the current state of the Pokémon list to local storage
	localStorage.setItem("pokedex", JSON.stringify(pokemonList));
};

/**
 * Imports Pokémon data from the text area, decodes it, and updates the local Pokémon list.
 * Validates the structure of the imported data and applies changes if valid.
 * Displays an error message in the textarea if the import fails.
 */
function importPokedexData() {
	const text = textarea.value;
	try {
		// Decode the base64 encoded text
		const base64Data = atob(text);

		// Parse the decoded text as JSON
		const pokedexData = JSON.parse(base64Data);

		// Validate the structure of the imported JSON data
		if (!pokedexData || !pokedexData.pokemonList) {
			throw new Error("Invalid JSON structure");
		}

		// Update the global Pokémon list with the imported data
		pokemonList = pokedexData.pokemonList;

		// Save the updated Pokémon list to local storage
		saveProgress();

		// Update the Pokémon counter display
		updatePokemonCounter();

		// Apply filters to the updated Pokémon list
		filterPokemon();
	} catch (error) {
		// Display an error message in the textarea if the import fails
		textarea.value = "Invalid import data. Please try again.";
		console.error("Error importing Pokedex data:", error);
	}
}

/**
 * Exports the current Pokémon data to the textarea in a base64 encoded string.
 * The exported data is a JSON object with a single property, "pokemonList", which
 * contains the list of Pokémon objects.
 */
function exportPokedexData() {
	const pokedexData = {
		pokemonList: pokemonList,
	};

	// Convert the JSON object to a base64 encoded string
	const jsonData = JSON.stringify(pokedexData);
	const base64Data = btoa(jsonData);

	// Set the value of the textarea to the base64 encoded string
	textarea.value = base64Data;
}

//Filters and Display -------------------------------------------------
/**
 * Filters the Pokémon displayed in the Pokédex based on active filters.
 * Updates the display of Pokémon cards and relevant statistics.
 */
const filterPokemon = () => {
	// If no filters are active, clear the Pokédex display and return
	if (!activeFilters.location && !activeFilters.time && !activeFilters.type && !activeFilters.variant) {
		pokedex.innerHTML = '';
		return;
	}

	// Get the filtered list of Pokémon evolution lines
	const filteredEvolutionLines = getFilteredLines();
	// Convert evolution lines into a display list of Pokémon
	const displayList = getDisplayList(filteredEvolutionLines);

	// Filter the display list based on the selected variant type
	const variantFilteredList = activeFilters.variant ? displayList.filter((pokemon) =>
		pokemon.variants.some((variant) => variant.type === activeFilters.variant)
	) : displayList;

	// Calculate area probability if all filters are active and there are Pokémon to display
	if (activeFilters.location && activeFilters.time && activeFilters.type && variantFilteredList.length > 0) {
		areaProbability(variantFilteredList);
	} else {
		// Hide route probability and completion statistics if conditions are not met
		document.getElementById("routeProbability").style.display = "none";
		document.getElementById("routeCompletion").style.display = "none";
	}

	// Update the display with the filtered Pokémon list
	displayPokemon(variantFilteredList);

	// Iterate through each variant group to update the display based on caught status
	const variantGroups = document.querySelectorAll(".variant-group");
	variantGroups.forEach((group) => {
		const caughtCards = group.querySelectorAll(".pokemon-card.caught");
		const allCards = group.querySelectorAll(".pokemon-card");

		// Hide the group if all Pokémon are caught and caught Pokémon are not shown
		group.style.display = (caughtCards.length === allCards.length && !showCaught) ? "none" : "block";
	});

	// Hide all caught Pokémon cards if the showCaught flag is false
	if (!showCaught) {
		const caughtCards = document.querySelectorAll(".pokemon-card.caught");
		caughtCards.forEach((card) => {
			card.style.display = "none";
		});
	}
};

/**
 * Returns a filtered list of Pokémon Base Forms based on active filters.
 * @returns {Array} - A list of Pokémon Base Forms that match all active filters.
 */
const getFilteredLines = () => {
	const baseForms = pokemonList.filter(pokemon => pokemon.previousForms.length === 0);

	// Filter the base forms by applying the tripleFilter function to each Pokémon
	return baseForms.filter(tripleFilter);
};

/**
 * Returns a list of Pokémon that match the active filters, including all evolutions.
 * This function takes a list of Pokémon base forms and returns a list of all Pokémon,
 * including evolutions, that match the active filters.
 * @param {Array} filteredLines - A list of Pokémon base forms that match the active filters.
 * @returns {Array} - A list of all Pokémon that match the active filters, including evolutions.
 */
const getDisplayList = (filteredLines) => {
	return filteredLines.flatMap((pokemon) => {
		const stages = [pokemon];
		let base = pokemon;

		// Find all evolutions of the current Pokémon
		let evoChains = pokemonList.filter((p) => p.previousForms.includes(base.id));

		// Add each evolution to the stages list
		evoChains.forEach((pokemon) => stages.push(pokemon));
		console.log("stage:", stages);
		return stages;
	});
};

/**
 * Returns an array of evolution lines for the given list of Pokémon.
 * An evolution line is a list of Pokémon that are in the same evolution chain.
 * @param {Array} pokemonList - The list of Pokémon to generate evolution lines for.
 * @returns {Array} - An array of evolution lines, where each line is a list of Pokémon.
 */
const getEvolutionRows = (pokemonList, variantNum) => {
	const baseForms = pokemonList.filter((pokemon) => pokemon.previousForms.length === 0);

	const evolutionLines = baseForms.map((baseForm) => {
		const line = [baseForm];

		// Find all evolutions of the current Pokémon
		let evoChain = pokemonList.filter((p) => p.previousForms.includes(baseForm.id));

		// Add each evolution to the line
		evoChain.forEach((pokemon) => line.push(pokemon));

		// Fill in missing evolutions with null values
		while (line.length < 6) {
			line.push(null);
		}

		return line;
	});



	/* Returns a string of HTML for a table row representing an evolution line.
	 * Each cell in the row contains a Pokémon card, unless the cell is empty,
	 * in which case it is left blank.
	 */
	return evolutionLines.map((line) => {
		const row = line.map((pokemon) => {
			if (!pokemon) return `<td></td>`;

			// Get the selected variant for the current Pokémon
			const selectedVariant = pokemon.variants[variantNum];

			return `
                <td>
                    <div class="pokemon-card ${selectedVariant?.caught ? "caught" : ""}"
                        onclick="toggleCaught(${pokemon.id}, '${selectedVariant.type}')">
                        <h4>${selectedVariant.type} ${pokemon.name}</h4>
                    </div>
                </td>
            `;
		}).join("");

		return `<tr>${row}</tr>`;
	}).join("");
};

/**
 * Displays Pokémon sorted by variant type and rarity in the Pokédex.
 * Filters and groups Pokémon based on active filters and caught status.
 * 
 * @param {Array} list - The list of Pokémon to display.
 */
const displayPokemon = (list) => {
	const variantOrder = ["Normal", "Dark", "Mystic", "Metallic", "Shadow", "Shiny"];
	const rarityOrder = ["Common", "Rare", "Legendary", "Ultra Beast"];

	// Group Pokémon by variant type and sort within each group by rarity
	const sortedByVariant = variantOrder.map((variantType) => ({
		type: variantType,
		pokemons: list.filter((pokemon) =>
			pokemon.variants.some((variant) => variant.type === variantType)
		).sort((a, b) => {
			const aRarityIndex = rarityOrder.indexOf(a.rarity);
			const bRarityIndex = rarityOrder.indexOf(b.rarity);
			return aRarityIndex - bRarityIndex;
		}),
	}));

	const fragment = document.createDocumentFragment();

	// Iterate over each variant group to build the display
	sortedByVariant.forEach((variantGroup) => {
		if (variantGroup.pokemons.length === 0) return; // Skip empty groups

		// Check if all Pokémon in the group are caught
		const allCaught = variantGroup.pokemons.every((pokemon) => {
			const variant = pokemon.variants.find((v) => v.type === variantGroup.type);
			return variant?.caught;
		});

		// Skip the group if all Pokémon are caught and caught Pokémon are hidden
		if (!showCaught && allCaught) return;

		// Filter out groups if a specific variant filter is active
		if (activeFilters.variant !== "" && activeFilters.variant !== variantGroup.type) return;

		const variantReference = variantOrder.findIndex(x => x === variantGroup.type);
		const groupDiv = document.createElement("div");
		groupDiv.className = "variant-group";
		groupDiv.innerHTML = `
            <h2>${variantGroup.type} Pokémon</h2>
            <table class="pokemon-table">
                <tr>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                    <th></th>
                </tr>
                ${getEvolutionRows(variantGroup.pokemons, variantReference)}
            </table>
        `;
		fragment.appendChild(groupDiv);
	});

	// Clear previous display and append the new Pokémon display
	pokedex.innerHTML = "";
	pokedex.appendChild(fragment);
};

//Capture Card Visibility -------------------------------------------------
/**
 * Toggles the caught status of the given Pokémon and its variant.
 * @param {number} id - The ID of the Pokémon to toggle.
 * @param {string} variantType - The type of the variant to toggle (e.g. "Normal", "Shiny", etc.).
 */
const toggleCaught = (id, variantType) => {
	const pokemon = pokemonList.find((p) => p.id === id);
	if (pokemon) {
		const variant = pokemon.variants.find((v) => v.type === variantType);
		if (variant) {
			// Toggle the caught status of the variant
			variant.caught = !variant.caught;
			// Save the updated progress to local storage
			saveProgress();
			// Re-apply filters to the Pokémon list
			filterPokemon();
			// Update the Pokémon counter display
			updatePokemonCounter();

			// If caught Pokémon are hidden, re-apply visibility rules
			if (!showCaught) {
				applyCaughtVisibilityRules();
			}
		}
	}
};

/**
 * Applies visibility rules to the Pokémon cards based on the showCaught flag.
 * If showCaught is true, all caught Pokémon cards are displayed. Otherwise, they are hidden.
 */
const applyCaughtVisibilityRules = () => {
	const caughtCards = document.querySelectorAll(".pokemon-card.caught");

	// Iterate over each caught Pokémon card and apply visibility rules
	caughtCards.forEach((card) => {
		// If showCaught is true, display the card. Otherwise, hide it.
		card.style.display = showCaught ? "block" : "none";
	});
};

/**
 * Toggles the visibility of caught Pokémon cards.
 * If showCaught is true, all caught Pokémon cards are displayed. Otherwise, they are hidden.
 * The button text is updated to reflect the new state.
 */
const toggleCaughtVisibility = () => {
	// Toggle the showCaught flag
	showCaught = !showCaught;

	// Apply visibility rules to the Pokémon cards
	applyCaughtVisibilityRules();

	// Update the button text
	const toggleButton = document.getElementById("toggleCaughtButton");
	toggleButton.textContent = showCaught ? "Hide Caught Pokémon" : "Show Caught Pokémon";

	// Re-apply filters to the Pokémon list
	filterPokemon();
};

//Counters ---------------------------------------------------------------
/**
 * Calculates the probability of encountering uncaught Pokémon in a specific area
 * based on active filters and updates the display with the calculated probabilities
 * and completion statistics.
 * 
 * @param {Array} areaPokemon - List of Pokémon present in the specified area.
 */
const areaProbability = (areaPokemon) => {
	// Probability values for each rarity type
	const rarityProbabilities = {
		"Common": 1,
		"Rare": 0.005,
		"Legendary": 0.001,
		"Ultra Beast": 0.0001
	};

	// Modifier values for common Pokémon variants
	const commonModifiers = {
		"Normal": 0.92,
		"Shiny": 0.01,
		"Dark": 0.02,
		"Mystic": 0.02,
		"Metallic": 0.02,
		"Shadow": 0.01,
	};

	// Modifier values for rare Pokémon variants
	const rareModifiers = {
		"Normal": 0.6,
		"Shiny": 0.05,
		"Dark": 0.1,
		"Mystic": 0.1,
		"Metallic": 0.1,
		"Shadow": 0.05,
	};

	// Filter Pokémon by location if a location filter is active
	const filteredByLocation = activeFilters.location ?
		areaPokemon.filter((pokemon) =>
			pokemon.locations.some((location) => location.place === activeFilters.location)
		) : areaPokemon;

	// Filter for Pokémon that are uncaught and match all active filters
	const uncaughtPokemon = filteredByLocation.filter((pokemon) =>
		pokemon.variants.some((variant) => !variant.caught) && tripleFilter(pokemon)
	);

	// Hide probability and completion display if there are no uncaught Pokémon
	if (uncaughtPokemon.length === 0) {
		document.getElementById("routeProbability").style.display = "none";
		document.getElementById("routeCompletion").style.display = "none";
		return;
	}

	let commonProb = 1;

	// Calculate total number of rare and common Pokémon
	const totalRares = filteredByLocation.filter((pokemon) =>
		pokemon.rarity === "Rare" ||
		(pokemon.previousForms.length > 0 && tripleFilter(pokemon))).length;

	const totalCommons = filteredByLocation.filter((pokemon) =>
		pokemon.rarity === "Common" && pokemon.previousForms.length === 0).length;

	// Adjust common probability based on presence of rarer Pokémon
	if (totalRares > 0) commonProb -= rarityProbabilities["Rare"];
	if (filteredByLocation.some((pokemon) => pokemon.rarity === "Legendary")) commonProb -= rarityProbabilities["Legendary"];
	if (filteredByLocation.some((pokemon) => pokemon.rarity === "Ultra Beast")) commonProb -= rarityProbabilities["Ultra Beast"];

	rarityProbabilities["Common"] = commonProb;

	let routeProbability = 0;

	// Calculate the probability for each uncaught Pokémon
	uncaughtPokemon.forEach((pokemon) => {
		let pokemonProbability = 0;
		let encounterRarity = pokemon.rarity;

		// Determine encounter rarity for high level common Pokémon
		if (pokemon.rarity === "Common" && pokemon.previousForms.length > 0) encounterRarity = "Rare";

		pokemonProbability = rarityProbabilities[encounterRarity];

		// Adjust probability based on total number of common or rare Pokémon
		if (encounterRarity === "Common" && totalCommons > 0) {
			pokemonProbability /= totalCommons;
		} else if (encounterRarity === "Rare" && totalRares > 0) {
			pokemonProbability /= totalRares;
		}

		// Select appropriate modifiers based on encounter rarity
		let selectedModifiers = encounterRarity === "Common" ? commonModifiers : rareModifiers;

		// Calculate probability contribution for each uncaught variant
		pokemon.variants.forEach((variant) => {
			if (!variant.caught) {
				routeProbability += pokemonProbability * selectedModifiers[variant.type];
			}
		});
	});

	// Calculate and round the final route probability
	routeProbability = 1 / routeProbability;
	routeProbability = Math.round(routeProbability);

	// Update total and caught Pokémon counts
	totalPokemon = areaPokemon.length * 6;
	caughtPokemon = 0;
	areaPokemon.forEach((pokemon) => {
		pokemon.variants.forEach((variant) => {
			if (variant.caught) {
				caughtPokemon += 1;
			}
		});
	});

	// Display probability and completion statistics
	document.getElementById("routeCompletion").style.display = "block";
	document.getElementById("routeProbability").style.display = "block";
	document.getElementById("routeProbability").textContent = `Route Chance: 1 in ${routeProbability}`;
	updateRouteCounter();
};

/**
 * Updates the display of the Overall Pokémon counter based on the current value of
 * `counterMode`.
 * 
 * @returns {void}
 */
const updatePokemonCounter = () => {
	// Calculate total number of Pokémon and number of caught Pokémon
	const totalPokemon = pokemonList.reduce(
		(sum, pokemon) => sum + pokemon.variants.length,
		0
	);
	const caughtPokemon = pokemonList.reduce(
		(sum, pokemon) =>
		sum + pokemon.variants.filter((variant) => variant.caught).length,
		0
	);

	const counterElement = document.getElementById("pokemonCounter");

	// Update the counter display based on the current value of `counterMode`
	if (counterMode === "count") {
		counterElement.textContent = `Caught: ${caughtPokemon} / ${totalPokemon}`;
	} else if (counterMode === "percent") {
		const percent = (caughtPokemon / totalPokemon) * 100;
		counterElement.textContent = `Caught: ${percent.toFixed(2)}%`;
	}
};

/**
 * Updates the display of the Route Pokémon counter based on the current value of
 * `counterMode`.
 * 
 * @returns {void}
 */
const updateRouteCounter = () => {
	// Update the counter display based on the current value of `counterMode`
	if (counterMode === "count") {
		// Display the count of caught Pokémon out of the total
		document.getElementById("routeCompletion").textContent = `Route : ${caughtPokemon} / ${totalPokemon} `
	} else if (counterMode === "percent") {
		// Display the percentage of caught Pokémon out of the total
		const percent = (caughtPokemon / totalPokemon) * 100;
		document.getElementById("routeCompletion").textContent = `Route : ${percent.toFixed(2)}%`
	}
}

// Event listeners -------------------------------------------------------------
exportBtn.addEventListener("click", exportPokedexData);
importBtn.addEventListener("click", importPokedexData);

//Allows Toggling Visibility of the settings menu and overlay
document.getElementById("settings-toggle").addEventListener("click", () => {
	const settingsMenu = document.getElementById("settings-menu");
	settingsMenu.style.display = "block";
	settingsOverlay.style.display = "block";
});

//Closes the settings menu and overlay when the user clicks outside of it
document.addEventListener("click", (e) => {
	if (e.target.id !== "settings-toggle" && e.target !== settingsMenu && !settingsMenu.contains(e.target)) {
		settingsMenu.style.display = "none";
		settingsOverlay.style.display = "none";
	}
});

//Enables toggling between count and percent modes for the counters
document.getElementById("statsDisplayButton").addEventListener("click", () => {
	if (counterMode === "count") {
		counterMode = "percent";
	} else {
		counterMode = "count";
	}
	document.getElementById("statsDisplayButton").textContent = `Stats Display: ${counterMode === "count" ? "Count" : "Percent"}`;
	updatePokemonCounter();
	updateRouteCounter();
});

window.onload = () => {
	loadPokemon().then(() => {
		// Add event listeners to the buttons
		document.getElementById("toggleCaughtButton").addEventListener("click", toggleCaughtVisibility);
		document.getElementById("clearProgressButton").addEventListener("click", clearProgress);

		// Populate the location filter dropdown with all unique location names
		populateLocationFilter();

		// Populate the time, type, and variant filter dropdowns with options
		populateFilterDropdowns();
	});
};
