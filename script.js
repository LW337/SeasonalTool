// DOM elements
const pokedex = document.getElementById("pokedex");
const locationFilter = document.getElementById("locationFilter");
const timeFilter = document.getElementById("timeFilter");
const typeFilter = document.getElementById("typeFilter");
const variantFilter = document.getElementById("variantFilter")
// Data storage and filter tracking
let pokemonList = [];
let activeFilters = {
    location: "",
    time: "",
    type: "",
    variant: ""
};

// Debounce function
const debounce = (func, delay) => {
    let debounceTimer;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
    }
};

// Add a common event listener function
const addFilterEventListeners = (filterElement, filterType) => {
    filterElement.addEventListener("change", debounce(() => {
        activeFilters[filterType] = filterElement.value;
        filterPokemon();
    }, 300));
};

addFilterEventListeners(locationFilter, "location");
addFilterEventListeners(timeFilter, "time");
addFilterEventListeners(typeFilter, "type");
addFilterEventListeners(variantFilter, "variant");

// Populate the fixed options for the time and type dropdowns
const populateFilterDropdowns = () => {
    timeFilter.innerHTML = `
        <option value="">All</option>
        <option value="Day">Day</option>
        <option value="Night">Night</option>
    `;

    typeFilter.innerHTML = `
        <option value="">All</option>
        <option value="Land">Land</option>
        <option value="Water">Water</option>
    `;

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

const loadPokemon = async () => {
    try {
        const savedData = localStorage.getItem("pokedex");
        if (savedData) {
            pokemonList = JSON.parse(savedData);
        } else {
            const response = await fetch("pokemon_list.json");
            if (!response.ok) throw new Error("Failed to load Pokémon data.");
            pokemonList = await response.json();
            localStorage.setItem("pokedex", JSON.stringify(pokemonList)); // Save to localStorage
        }
        updatePokemonCounter(); // Update the counter after loading data
        filterPokemon(); // Apply initial filters
    } catch (error) {
        console.error("Error loading Pokémon data:", error);
        pokedex.innerHTML = `<p>Error loading Pokémon data: ${error.message}</p>`;
    }
};

// Apply filters to Pokémon list
const filterPokemon = () => {
    if (!activeFilters.location && !activeFilters.time && !activeFilters.type && !activeFilters.variant) {
        pokedex.innerHTML = ''; // Clear the display if no filters are active
        return;
    }

    const filteredLines = getFilteredLines();
    const displayList = getDisplayList(filteredLines);

    // Apply variant filter
    const filteredByVariant = activeFilters.variant ?
        displayList.filter((pokemon) =>
            pokemon.variants.some((variant) => variant.type === activeFilters.variant)
        ) :
        displayList;

    if (activeFilters.location != "" && activeFilters.time != "" && activeFilters.type != "" && filteredByVariant.length > 0) {
        areaProbability(filteredByVariant);
    } else {
        document.getElementById("routeProbability").style.visibility = "hidden"
        document.getElementById("routeCompletion").style.visibility = "hidden"
    }

    // Display Pokémon and reapply visibility rules for caught Pokémon
    displayPokemon(filteredByVariant);

    // Check and hide fully caught groups
    const variantGroups = document.querySelectorAll(".variant-group");
    variantGroups.forEach((group) => {
        const caughtCards = group.querySelectorAll(".pokemon-card.caught");
        const allCards = group.querySelectorAll(".pokemon-card");

        if (caughtCards.length === allCards.length) {
            group.style.display = showCaught ? "block" : "none";
        } else {
            group.style.display = "block";
        }
    });

    if (!showCaught) {
        const caughtCards = document.querySelectorAll(".pokemon-card.caught");
        caughtCards.forEach((card) => {
            card.style.display = "none"; // Hide caught cards
        });
    }
};

// Get the filtered evolution lines
const getFilteredLines = () => {
    const evolutionLines = pokemonList.filter(pokemon => pokemon.previousForms.length === 0);

    return evolutionLines.filter((pokemon) => {
        return pokemon.locations.some((location) => {
            const matchesLocation = activeFilters.location ? location.place === activeFilters.location : true;
            const matchesTime = activeFilters.time ? location.time === activeFilters.time : true;
            const matchesType = activeFilters.type ? location.type === activeFilters.type : true;
            return matchesLocation && matchesTime && matchesType;
        });
    });
};

// Get the full display list with evolution stages
const getDisplayList = (filteredLines) => {
    return filteredLines.flatMap((pokemon) => {
        const stages = [pokemon];
        let base = pokemon;

        let evoChains = pokemonList.filter((p) => p.previousForms.includes(base.id));

        evoChains.forEach((pokemon) => stages.push(pokemon));

        return stages;
    });
};

// Display Pokémon in HTML tables by variant
const displayPokemon = (list) => {
    const variantOrder = ["Normal", "Dark", "Mystic", "Metallic", "Shadow", "Shiny"];
    const rarityOrder = ["Common", "Rare", "Legendary", "Ultra Beast"]; // Example rarity order

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
    sortedByVariant.forEach((variantGroup) => {
        if (variantGroup.pokemons.length === 0) return; // Skip empty groups

        const allCaught = variantGroup.pokemons.every((pokemon) => {
            const variant = pokemon.variants.find((v) => v.type === variantGroup.type);
            return variant?.caught; // Ensure we're checking the specific variant
        });

        if (!showCaught && allCaught) return;

        if (activeFilters.variant != "" && activeFilters.variant != variantGroup.type) return;

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

    pokedex.innerHTML = "";
    pokedex.appendChild(fragment);
};

// Generate the evolution rows for each Pokémon variant
const getEvolutionRows = (pokemonList, variantNum) => {
    const baseForms = pokemonList.filter((pokemon) => pokemon.previousForms.length === 0);

    const evolutionLines = baseForms.map((baseForm) => {
        const line = [baseForm];

        // Get all Pokémon that evolve from the baseForm
        let evoChain = pokemonList.filter((p) => p.previousForms.includes(baseForm.id));

        // Add each Pokémon to the evolution line
        evoChain.forEach((pokemon) => line.push(pokemon));

        // Fill missing stages with null if the line is less than 6
        while (line.length < 6) {
            line.push(null);
        }

        return line; // Return the full evolution line
    });

    // Generate the HTML rows for each evolution line
    return evolutionLines.map((line) => {
        const row = line.map((pokemon) => {
            if (!pokemon) return `<td></td>`; // Empty stage for missing Pokémon

            const selectedVariant = pokemon.variants[variantNum];
            // Render the Pokémon card with caught status
            return `
                <td>
                    <div class="pokemon-card ${selectedVariant?.caught ? "caught" : ""}"
                        onclick="toggleCaught(${pokemon.id}, '${selectedVariant.type}')">
                        <h4>${selectedVariant.type} ${pokemon.name}</h4>
                    </div>
                </td>
            `;
        }).join(""); // Join cells into a single row

        return `<tr>${row}</tr>`; // Wrap the row with <tr> tags
    }).join(""); // Join all rows together
};

// Populate the location filter dropdown with unique locations
const populateLocationFilter = () => {
    const allLocations = new Set();
    pokemonList.forEach(pokemon => {
        pokemon.locations.forEach(location => allLocations.add(location.place));
    });
    const sortedLocations = sortLocations([...allLocations], /^Route \d+$/i);
    const options = [
        `<option value="">No Route Selected</option>`,
        ...sortedLocations.map(location => `<option value="${location}">${location}</option>`),
    ];
    locationFilter.innerHTML = options.join("");
};

const clearProgress = () => {
    const confirmation = window.confirm("Are you sure you want to clear your progress? This action cannot be undone.");
    if (confirmation) {
        localStorage.removeItem("pokedex");
        loadPokemon(); // Reload Pokémon data
    }
};

document.getElementById("clearProgressButton").addEventListener("click", clearProgress);

const saveProgress = () => {
    localStorage.setItem("pokedex", JSON.stringify(pokemonList));
};

const toggleCaught = (id, variantType) => {
    const pokemon = pokemonList.find((p) => p.id === id);
    if (pokemon) {
        const variant = pokemon.variants.find((v) => v.type === variantType);
        if (variant) {
            variant.caught = !variant.caught;
            saveProgress(); // Save updated progress
            filterPokemon(); // Re-render the list
            updatePokemonCounter(); // Update the counter

            // Reapply visibility rules if caught Pokémon are hidden
            if (!showCaught) {
                applyCaughtVisibilityRules();
            }
        }
    }
};

let showCaught = true;

// Function to apply visibility rules for caught Pokémon
const applyCaughtVisibilityRules = () => {
    const caughtCards = document.querySelectorAll(".pokemon-card.caught");
    caughtCards.forEach((card) => {
        card.style.display = showCaught ? "block" : "none";
    });
};

// Function to toggle the visibility of caught Pokémon
const toggleCaughtVisibility = () => {
    showCaught = !showCaught;
    applyCaughtVisibilityRules();

    const toggleButton = document.getElementById("toggleCaughtButton");
    toggleButton.textContent = showCaught ? "Hide Caught Pokémon" : "Show Caught Pokémon";

    filterPokemon();
};

document.getElementById("toggleCaughtButton").addEventListener("click", toggleCaughtVisibility);

window.onload = () => {
    loadPokemon().then(() => {
        populateLocationFilter();
        populateFilterDropdowns();
    });
};

const areaProbability = (areaPokemon) => {
    // Filter Pokémon based on the active location filter
    const filteredByLocation = activeFilters.location ?
        areaPokemon.filter((pokemon) =>
            pokemon.locations.some((location) => location.place === activeFilters.location)
        ) :
        areaPokemon;

    const uncaughtPokemon = filteredByLocation.filter((pokemon) =>
        pokemon.variants.some((variant) => !variant.caught) &&
        pokemon.locations.some((location) =>
            location.place === activeFilters.location &&
            location.time === activeFilters.time &&
            location.type === activeFilters.type
        )
    );

    // Initialize probabilities
    let commonProb = 1
    const rarityProbabilities = {
        "Common": 1,
        "Rare": 0.005,
        "Legendary": 0.001,
        "Ultra Beast": 0.0001
    };

    const totalRares = (filteredByLocation.filter((pokemon) =>
        pokemon.rarity === "Rare" ||
        pokemon.locations.some((location) =>
            location.place === activeFilters.location &&
            location.time === activeFilters.time &&
            location.type === activeFilters.type
        ) && pokemon.previousForms.length > 0)).length;

    const totalCommons = filteredByLocation.filter((pokemon) =>
        pokemon.rarity === "Common" && pokemon.previousForms.length === 0).length;

    // Adjust probabilities based on rarities in the uncaught Pokémon
    if (totalRares > 0) commonProb -= rarityProbabilities["Rare"];
    if (filteredByLocation.some((pokemon) => pokemon.rarity === "Legendary")) commonProb -= rarityProbabilities["Legendary"];
    if (filteredByLocation.some((pokemon) => pokemon.rarity === "Ultra Beast")) commonProb -= rarityProbabilities["Ultra Beast"];

    rarityProbabilities["Common"] = commonProb
    const commonModifiers = {
        "Normal": 0.92,
        "Shiny": 0.01,
        "Dark": 0.02,
        "Mystic": 0.02,
        "Metallic": 0.02,
        "Shadow": 0.01,
    };
    const rareModifiers = {
        "Normal": 0.6,
        "Shiny": 0.05,
        "Dark": 0.1,
        "Mystic": 0.1,
        "Metallic": 0.1,
        "Shadow": 0.05,
    };
    let routeProbability = 0;

    uncaughtPokemon.forEach((pokemon) => {
        let pokemonProbability = 0;
        let encounterRarity = pokemon.rarity;

        // Set encounterRarity based on conditions
        if (pokemon.rarity === "Common" && pokemon.previousForms.length === 0) encounterRarity = "Common";
        if (pokemon.rarity === "Common" && pokemon.previousForms.length > 0) encounterRarity = "Rare";

        // Get the base probability based on the encounterRarity
        pokemonProbability = rarityProbabilities[encounterRarity];

        // Normalize the probability based on the rarity (divide by totalCommons or totalRares)
        if (encounterRarity === "Common" && totalCommons > 0) {
            pokemonProbability /= totalCommons;
        } else if (encounterRarity === "Rare" && totalRares > 0) {
            pokemonProbability /= totalRares;
        }

        // Apply the appropriate modifier based on the encounterRarity
        let selectedModifiers = encounterRarity === "Common" ? commonModifiers : rareModifiers;

        // Loop through each variant to adjust the route probability
        pokemon.variants.forEach((variant) => {
            if (!variant.caught) {
                routeProbability += pokemonProbability * selectedModifiers[variant.type];
            }
        });
    });
    routeProbability = 1 / routeProbability
    routeProbability = Math.round(routeProbability)

    let totalPokemon = (areaPokemon.length) * 6
    let caughtPokemon = 0;

    areaPokemon.forEach((pokemon) => {
        pokemon.variants.forEach((variant) => {
            if (variant.caught) {
                console.log(pokemon.name)
                caughtPokemon += 1
            };
        });
    });

    document.getElementById("routeCompletion").style.visibility = "visible"

    document.getElementById("routeCompletion").textContent = `Route : ${caughtPokemon} / ${totalPokemon} `

    document.getElementById("routeProbability").style.visibility = "visible"

    if (routeProbability != Infinity) {
        document.getElementById("routeProbability").textContent = `Route Chance: 1 in ${routeProbability}`

    } else {
        document.getElementById("routeCompletion").textContent = "Complete"
        document.getElementById("routeProbability").style.display = "None"
    }
};

const updatePokemonCounter = () => {
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
    counterElement.textContent = `Caught: ${caughtPokemon} / ${totalPokemon}`;
};

// Function to sort locations
const sortLocations = (locations, regex) => {
    const matching = [];
    const nonMatching = [];
    locations.forEach((location) => {
        if (regex.test(location)) {
            matching.push(location);
        } else {
            nonMatching.push(location);
        }
    });
    matching.sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
    nonMatching.sort();
    return [...matching, ...nonMatching];
};
