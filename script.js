const pokedex = document.getElementById("pokedex");
const searchInput = document.getElementById("search");

let pokemonList = [];

// Define the order of variants
const variantOrder = ["Normal", "Dark", "Mystic", "Metallic", "Shiny", "Shadow"];

const loadPokemonFromFile = async () => {
  try {
    const response = await fetch("./pokemon.json");
    if (!response.ok) {
      throw new Error(`Failed to load Pokémon file: ${response.statusText}`);
    }
    const data = await response.json();
    pokemonList = data;

    // Load progress from localStorage and merge it with the fetched data
    loadProgress();

    // Display Pokémon
    displayPokemon(pokemonList);
  } catch (error) {
    console.error("Error loading Pokémon file:", error);
    pokedex.innerHTML = `<p>Error loading Pokémon data. Check console for details.</p>`;
  }
};

const displayPokemon = (list) => {
  const sortedByVariant = variantOrder.map((variantType) => {
    return {
      type: variantType,
      pokemons: list
        .filter((pokemon) =>
          pokemon.variants.some((variant) => variant.type === variantType)
        )
        .sort((a, b) => a.id - b.id),
    };
  });

  pokedex.innerHTML = sortedByVariant
    .map((variantGroup) => {
      return `
        <div class="variant-group">
          <h2>${variantGroup.type} Pokémon</h2>
          <div class="variants">
            ${variantGroup.pokemons
              .map((pokemon) => {
                const variant = pokemon.variants.find((v) => v.type === variantGroup.type);
                return `
                  <div class="pokemon-card ${variant.caught ? "caught" : ""}" onclick="toggleCaught(${pokemon.id}, '${variant.type}')">
                    <h3>${pokemon.name} - ${variant.type} Pokémon</h3>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");
};

const toggleCaught = (id, variantType) => {
  const pokemon = pokemonList.find((p) => p.id === id);
  if (pokemon) {
    const variant = pokemon.variants.find((v) => v.type === variantType);
    if (variant) {
      variant.caught = !variant.caught;
      saveProgress();
      displayPokemon(pokemonList);
    }
  }
};

const filterPokemon = () => {
  const searchTerm = searchInput.value.toLowerCase();
  const filtered = pokemonList.filter((p) =>
    p.name.toLowerCase().includes(searchTerm)
  );
  displayPokemon(filtered);
};

const saveProgress = () => {
  localStorage.setItem("pokedex", JSON.stringify(pokemonList));
};

const loadProgress = () => {
  const saved = localStorage.getItem("pokedex");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        pokemonList.forEach((pokemon) => {
          const savedPokemon = parsed.find((p) => p.id === pokemon.id);
          if (savedPokemon && savedPokemon.variants) {
            pokemon.variants = savedPokemon.variants;
          }
        });
      }
    } catch (e) {
      console.error("Error loading progress from localStorage:", e);
    }
  }
};

window.onload = () => {
  loadPokemonFromFile(); // Load Pokémon data from the JSON file
};
