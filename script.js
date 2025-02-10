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
let areasArray = {}

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

        if (activeFilters.location || activeFilters.time || activeFilters.type || activeFilters.variant) {
            filterPokemon();
        }

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
 * Imports Pokémon data from a base64 encoded string in the textarea element.
 * The data should be a JSON object with a single property, "pokemonList", which
 * contains an array of pokemon objects. Each pokemon object should have the
 * following properties: id, name, and variants. The variants property should be
 * an array of variant objects, each with the following properties: type and caught.
 * The caught property should be a boolean indicating whether the variant has been
 * caught or not.
 */
function importPokedexData() {
    try {
        const base64EncodedData = textarea.value;
        textarea.value = "";
        const gzipCompressedData = atob(base64EncodedData);
        const gzipCompressedArray = new Uint8Array(gzipCompressedData.length);
        for (let i = 0; i < gzipCompressedData.length; i++) {
            gzipCompressedArray[i] = gzipCompressedData.charCodeAt(i);
        }
        const minifiedData = pako.ungzip(gzipCompressedArray);
        const decoder = new TextDecoder('utf-8');
        const decodedData = decoder.decode(minifiedData);
        let pokedexData = JSON.parse(decodedData);
        pokedexData = {
            pokemonList: pokedexData
        }

        // Check if each pokemon object has the expected properties
        pokedexData.pokemonList.forEach((pokemon) => {
            if (!pokemon.id || !pokemon.variants) {
                textarea.value = "Invalid pokemon data";
                throw new Error("Invalid pokemon data");
            }
        });

        // Merge the imported data with the existing pokemonList data
        pokedexData.pokemonList.forEach((importedPokemon) => {
            const existingPokemon = pokemonList.find((pokemon) => pokemon.id === importedPokemon.id);
            if (existingPokemon) {
                // Find the variants that exist in the imported data
                const importedVariantIds = importedPokemon.variants.map((variant) => variant.type);
                const existingVariantIds = existingPokemon.variants.map((variant) => variant.type);

                // Update the existing variants with the imported values
                existingPokemon.variants = existingPokemon.variants.map((variant) => {
                    if (importedVariantIds.includes(variant.type)) {
                        const importedVariant = importedPokemon.variants.find((v) => v.type === variant.type);
                        return {
                            ...variant,
                            caught: importedVariant.caught
                        };
                    }
                    return variant;
                });
            }
        });

        // Save the updated pokemonList to local storage
        saveProgress();
        // Update the Pokémon counter display
        updatePokemonCounter();
        // Apply filters to the updated pokemonList
        filterPokemon();

    } catch (error) {
        textarea.value = `Invalid pokemon data\nSee console for details`;
        console.error('Error importing Pokémon data:', error);
    }
}

/**
 * Exports the caught Pokémon data to a base64 encoded string in the textarea element.
 * The string represents a JSON object with a single property, "pokemonList", which
 * contains an array of pokemon objects. Each pokemon object has the following
 * properties: id, name, and variants. The variants property is an array of
 * variant objects, each with the following properties: type and caught. The
 * caught property is a boolean indicating whether the variant has been caught or
 * not.
 */
function exportPokedexData() {

    // Get the list of caught Pokémon
    const caughtPokemonList = pokemonList.filter((pokemon) => {
        // Check if any variant of the Pokémon has been caught
        return pokemon.variants.some((variant) => variant.caught);
    }).map((pokemon) => {
        // Create a new object with only the caught variants
        return {
            id: pokemon.id,
            variants: pokemon.variants.filter((variant) => variant.caught),
        };
    });

    const minifiedData = JSON.stringify(caughtPokemonList).replace(/\s+/g, '');
    const gzipCompressedData = pako.gzip(minifiedData);
    const base64EncodedData = btoa(String.fromCharCode.apply(null, gzipCompressedData));

    // Set the value of the textarea to the base64 encoded string
    textarea.value = base64EncodedData;
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

    // Get the filtered list of Pokémon evolution lines and convert them to display list
    const displayList = getDisplayList(getFilteredLines());

    // Apply variant filter if active
    const variantFilteredList = activeFilters.variant ? displayList.filter(pokemon =>
        pokemon.variants.some(variant => variant.type === activeFilters.variant)
    ) : displayList;

    // Calculate area probability if all filters are active and there are Pokémon to display
    if (activeFilters.location && activeFilters.time && activeFilters.type && variantFilteredList.length > 0) {
        areaProbability(variantFilteredList);
    } else {
        document.getElementById("routeProbability").style.display = "none";
        document.getElementById("routeCompletion").style.display = "none";
    }

    // Update the display with the filtered Pokémon list
    displayPokemon(variantFilteredList);

    // Update variant group display based on the caught status
    document.querySelectorAll(".variant-group").forEach(group => {
        const allCards = group.querySelectorAll(".pokemon-card");
        const allCaught = Array.from(allCards).every(card => card.classList.contains("caught"));
        group.style.display = (allCaught && !showCaught) ? "none" : "block";
    });

    // Hide all caught Pokémon cards if the showCaught flag is false
    if (!showCaught) {
        document.querySelectorAll(".pokemon-card.caught").forEach(card => {
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

document.getElementById("recommendedRouteButton").addEventListener("click", recommendedRoute);

// Areas and Probabilities -------------------------------------------------------------
/**
 * Finds the optimal route based on the active filters and updates the filters and
 * the Pokémon display accordingly.
 */
function recommendedRoute() {
    // Sort the areasArray based on the activeFilters.type
    const sortedAreas = areasArray.sort((a, b) => {
        const locationA = a.name;
        const locationB = b.name;
        const regex = new RegExp(/^Route \d+$/i);

        if (regex.test(locationA)) {
            if (regex.test(locationB)) {
                // Compare the route numbers
                return parseInt(locationA.match(/\d+/)) - parseInt(locationB.match(/\d+/));
            } else {
                // Sort routes before other locations
                return -1;
            }
        } else {
            if (regex.test(locationB)) {
                // Sort other locations after routes
                return 1;
            } else {
                // Sort other locations alphabetically
                return locationA.localeCompare(locationB);
            }
        }
    });

    let matchingRoutes = [];

    const timeValues = sortedAreas.map((area) => {
		const landTime = area.types.Land || {};
		const waterTime = area.types.Water || {};
		if (Object.keys(landTime).length === 0 || Object.keys(waterTime).length === 0) {
			time = {
				...landTime,
				...waterTime
			};
		} else {
			const landMinTime = activeFilters.time === "" ? Math.min(...Object.values(landTime)) : landTime[activeFilters.time];
			const waterMinTime = activeFilters.time === "" ? Math.min(...Object.values(waterTime)) : waterTime[activeFilters.time];
			time = landMinTime < waterMinTime ? landTime : waterTime;
		}
	
		const value = activeFilters.time === "" ? Math.min(...Object.values(time)) : time[activeFilters.time];
		return isNaN(value) ? null : value; // filter out NaN values
	}).filter((value) => value !== null); // remove null values from the array

    const minTimeValue = Math.min(...timeValues);
	
    matchingRoutes = sortedAreas.filter((area) => {
        const landTime = area.types.Land || {};
        const waterTime = area.types.Water || {};
        if (Object.keys(landTime).length === 0 || Object.keys(waterTime).length === 0) {
            time = {
                ...landTime,
                ...waterTime
            };
        } else {
            const landMinTime = activeFilters.time === "" ? Math.min(...Object.values(landTime)) : landTime[activeFilters.time];
            const waterMinTime = activeFilters.time === "" ? Math.min(...Object.values(waterTime)) : waterTime[activeFilters.time];
            time = landMinTime < waterMinTime ? landTime : waterTime;
        }

        return activeFilters.time === "" ? Math.min(...Object.values(time)) === minTimeValue : time[activeFilters.time] === minTimeValue;
    });

    let optimalRoute = matchingRoutes[0]
    const minType = Object.keys(optimalRoute.types).reduce((minKey, currentKey) =>
        Math.min(optimalRoute.types[minKey][activeFilters.time], optimalRoute.types[currentKey][activeFilters.time]) === optimalRoute.types[currentKey][activeFilters.time] ? currentKey : minKey
    );

    if (activeFilters.time === "") {
        const minTime = Object.keys(optimalRoute.types[minType]).find(time => optimalRoute.types[minType][time] === Math.min(...Object.values(optimalRoute.types[minType])));
        activeFilters.time = minTime;
    }

    activeFilters.location = matchingRoutes[0].name
    activeFilters.type = minType

    // Update the type dropdown
    typeFilter.value = activeFilters.type;

    // Update the time dropdown
    timeFilter.value = activeFilters.time;

    // Update the location dropdown
    locationFilter.value = activeFilters.location;
    filterPokemon();
}
/**
 * Generates an array of objects representing areas in the game.
 *
 * Each object in the array has a "name" property with the name of the area,
 * and a "types" property which is an object with type names as keys and
 * objects with time of day as keys and a count of 0 as values.
 *
 * @returns {Array} - An array of objects representing areas in the game.
 */
function generateAreasArray() {
    const areas = {};

    // Loop through all the pokemon and their locations
    pokemonList.forEach((pokemon) => {
        pokemon.locations.forEach((location) => {
            const routeName = location.place;
            const routeType = location.type;
            const timeOfDay = location.time;

            // If the area doesn't exist in the object, add it
            if (!areas[routeName]) {
                areas[routeName] = {};
            }

            // If the type doesn't exist in the area, add it
            if (!areas[routeName][routeType]) {
                areas[routeName][routeType] = {};
            }

            // If the time of day doesn't exist in the type, add it
            if (!areas[routeName][routeType][timeOfDay]) {
                areas[routeName][routeType][timeOfDay] = 0;
            }
        });
    });

    // Convert the object to an array of objects
    const areasArray = Object.keys(areas).map((routeName) => {
        const routeTypes = Object.keys(areas[routeName]).map((routeType) => {
            const timesOfDay = Object.keys(areas[routeName][routeType]).map((timeOfDay) => {
                return {
                    [timeOfDay]: 0
                };
            });

            return {
                [routeType]: Object.assign({}, ...timesOfDay)
            };
        });

        return {
            name: routeName,
            types: Object.assign({}, ...routeTypes)
        };
    });

    return areasArray;
}

/**
 * Calculates the probability for each area, type, and time combination 
 * and updates the areasArray with the calculated probabilities.
 */
function allProbabilities() {
    // Iterate over each area in the areasArray
    areasArray.forEach((area) => {
        // Iterate over each type within the area
        Object.keys(area.types).forEach((type) => {
            // Iterate over each time of day within the type
            Object.keys(area.types[type]).forEach((timeOfDay) => {
                // Filter the Pokémon list to match the current area, type, and time of day
                const filteredPokemonList = pokemonList.filter((pokemon) => {
                    return pokemon.locations.some((location) => {
                        const matchesRoute = location.place === area.name;
                        const matchesType = location.type === type;
                        const matchesTime = location.time === timeOfDay;

                        return matchesRoute && matchesType && matchesTime;
                    });
                });

                // Calculate the probability for the current filters
                const probability = calculateProbability(filteredPokemonList);
                // Update the areasArray with the calculated probability
                area.types[type][timeOfDay] = probability;
            });
        });
    });
}

/**
 * Calculates the probability of encountering a Pokémon based on the rarity of the Pokémon, the 
 * presence of other Pokémon of the same rarity, and the modifiers for each variant type.
 * 
 * @param {Array} pokemonList - The list of Pokémon to calculate the probability for.
 * @param {Array} filteredPokemonList - The filtered list of Pokémon that match all active filters.
 * 
 * @returns {Number} The calculated probability of encountering a Pokémon.
 */
function calculateProbability(filteredPokemonList) {
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

    // Filter for Pokémon that are uncaught and match all active filters
    const uncaughtPokemon = filteredPokemonList.filter((pokemon) =>
        pokemon.variants.some((variant) => !variant.caught)
    );

    let routeProbability = 0;

    // Hide probability and completion display if there are no uncaught Pokémon
    if (uncaughtPokemon.length === 0) {
        return;
    }

    let commonProb = 1;

    // Calculate total number of rare and common Pokémon
    const totalRares = filteredPokemonList.filter((pokemon) =>
        pokemon.rarity === "Rare" ||
        (pokemon.previousForms.length > 0 && tripleFilter(pokemon))).length;

    const totalCommons = filteredPokemonList.filter((pokemon) =>
        pokemon.rarity === "Common" && pokemon.previousForms.length === 0).length;

    // Adjust common probability based on presence of rarer Pokémon
    if (totalRares > 0) commonProb -= rarityProbabilities["Rare"];
    if (filteredPokemonList.some((pokemon) => pokemon.rarity === "Legendary")) commonProb -= rarityProbabilities["Legendary"];
    if (filteredPokemonList.some((pokemon) => pokemon.rarity === "Ultra Beast")) commonProb -= rarityProbabilities["Ultra Beast"];

    rarityProbabilities["Common"] = commonProb;

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
    return routeProbability;
}

/**
 * Calculates the probability of encountering all Pokémon in a given area.
 * Updates the areasArray with the calculated probability and displays
 * the probability and completion statistics.
 * 
 * @param {Array} areaPokemon - The list of Pokémon in the area.
 */
const areaProbability = (areaPokemon) => {
    let filteredPokemonList = areaPokemon;
    filteredPokemonList = filteredPokemonList.filter(tripleFilter);

    // Calculate the route probability
    let routeProbability = calculateProbability(filteredPokemonList);

    // Update the areasArray with the calculated probability
    let area = areasArray.find(area => area.name === activeFilters.location);
    area = area.types[activeFilters.type];
    area[activeFilters.time] = routeProbability;

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
	
	if (routeProbability != undefined) {
		document.getElementById("routeProbability").style.display = "block";
		document.getElementById("routeProbability").textContent = `Route Chance: 1 in ${routeProbability}`;
	} else {
		document.getElementById("routeProbability").style.display = "none";
	}
    
    updateRouteCounter();
};


window.onload = () => {
    loadPokemon().then(() => {
        // Add event listeners to the buttons
        document.getElementById("toggleCaughtButton").addEventListener("click", toggleCaughtVisibility);
        document.getElementById("clearProgressButton").addEventListener("click", clearProgress);

        // Populate the location filter dropdown with all unique location names
        populateLocationFilter();

        // Populate the time, type, and variant filter dropdowns with options
        populateFilterDropdowns();
        areasArray = generateAreasArray();
        allProbabilities();
    });
};
