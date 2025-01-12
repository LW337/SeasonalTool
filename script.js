// DOM elements
const pokedex = document.getElementById("pokedex");
const locationFilter = document.getElementById("locationFilter");
const timeFilter = document.getElementById("timeFilter");
const typeFilter = document.getElementById("typeFilter");

// Data storage and filter tracking
let pokemonList = [];
let activeFilters = {
    location: "",
    time: "",
    type: ""
};

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
};

const loadPokemon = async () => {
    try {
        const savedData = localStorage.getItem("pokedex");
        if (savedData) {
            pokemonList = JSON.parse(savedData);
            filterPokemon(); // Load saved progress
        } else {
            const response = await fetch("pokemon_list.json");
            if (!response.ok) throw new Error("Failed to load Pokémon data.");
            pokemonList = await response.json();
            localStorage.setItem("pokedex", JSON.stringify(pokemonList)); // Save to localStorage
            filterPokemon();
        }
    } catch (error) {
        console.error("Error loading Pokémon data:", error);
        pokedex.innerHTML = `<p>Error loading Pokémon data: ${error.message}</p>`;
    }
};

// Apply filters to Pokémon list
const filterPokemon = () => {
    if (!activeFilters.location && !activeFilters.time && !activeFilters.type) {
        pokedex.innerHTML = ''; // Clear the display if no filters are active
        return;
    }

    const filteredLines = getFilteredLines();
    const displayList = getDisplayList(filteredLines);

    // Display Pokémon and reapply visibility rules for caught Pokémon
    displayPokemon(displayList);

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
    const variantOrder = ["Normal", "Dark", "Mystic", "Metallic", "Shiny", "Shadow"];
    const sortedByVariant = variantOrder.map((variantType) => ({
        type: variantType,
        pokemons: list.filter((pokemon) =>
            pokemon.variants.some((variant) => variant.type === variantType)
        ),
    }));

    pokedex.innerHTML = sortedByVariant
        .map((variantGroup) => {
            if (variantGroup.pokemons.length === 0) return ""; // Skip empty groups
            const variantReference = variantOrder.findIndex(x => x === variantGroup.type);
            return `
                <div class="variant-group">
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
                </div>
            `;
        })
        .join("");
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

    pokemonList.forEach((pokemon) => {
        pokemon.locations.forEach((location) => {
            allLocations.add(location.place);
        });
    });

    const routes = [];
    const namedLocations = [];

    allLocations.forEach((location) => {
        if (/^Route \d+$/i.test(location)) {
            routes.push(location);
        } else {
            namedLocations.push(location);
        }
    });

    routes.sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
    namedLocations.sort();

    const options = [
        `<option value="">All</option>`,
        ...routes.map((route) => `<option value="${route}">${route}</option>`),
        ...namedLocations.map((named) => `<option value="${named}">${named}</option>`),
    ];

    locationFilter.innerHTML = options.join("");
};

// Call functions after loading Pokémon data
window.onload = () => {
    loadPokemon().then(() => {
        populateLocationFilter();
        populateFilterDropdowns();
    });
};

// Update filters and re-filter Pokémon
locationFilter.addEventListener("change", () => {
    activeFilters.location = locationFilter.value;
    filterPokemon();
});

timeFilter.addEventListener("change", () => {
    activeFilters.time = timeFilter.value;
    filterPokemon();
});

typeFilter.addEventListener("change", () => {
    activeFilters.type = typeFilter.value;
    filterPokemon();
});

const clearProgress = () => {
    localStorage.removeItem("pokedex");
    loadPokemon(); // Reload Pokémon data
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

            // Reapply visibility rules if caught Pokémon are hidden
            if (!showCaught) {
                const caughtCards = document.querySelectorAll(".pokemon-card.caught");
                caughtCards.forEach((card) => {
                    card.style.display = "none";
                });
            }
        }
    }
};

let showCaught = true; // This variable will track the visibility status of caught Pokémon

// Function to toggle the visibility of caught Pokémon
const toggleCaughtVisibility = () => {
    showCaught = !showCaught;

    const caughtCards = document.querySelectorAll(".pokemon-card.caught");
    caughtCards.forEach((card) => {
        card.style.display = showCaught ? "block" : "none";
    });

    const toggleButton = document.getElementById("toggleCaughtButton");
    toggleButton.textContent = showCaught ? "Hide Caught Pokémon" : "Show Caught Pokémon";

    filterPokemon();
};

document.getElementById("toggleCaughtButton").addEventListener("click", toggleCaughtVisibility);
