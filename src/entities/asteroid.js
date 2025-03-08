// Asteroid configuration
const ASTEROID_CONFIG = {
    baseRadius: 25,                  // Base radius of the asteroid
    healthVariation: {               // Health variations based on level
        low: 5,                      // Low level asteroid health
        medium: 10,                  // Medium level asteroid health
        high: 15                     // High level asteroid health
    },
    colors: {
        low: 'orange',               // Color for low level asteroids
        medium: 'red',               // Color for medium level asteroids  
        high: 'purple'               // Color for high level asteroids
    },
    spritePaths: {                   // Paths to asteroid sprite files
        low: './assets/asteroids/asteroid_low.svg',
        medium: './assets/asteroids/asteroid_medium.svg',
        high: './assets/asteroids/asteroid_high.svg'
    }
};

// Resource types and rarities
const RESOURCE_TYPES = {
    common: {
        ordinaryMinerals: { min: 20, max: 40, chance: 0.95 },
        metalScraps: { min: 10, max: 20, chance: 0.8 }
    },
    uncommon: {
        titaniumFragments: { min: 5, max: 10, chance: 0.4 },
        quartzCrystals: { min: 3, max: 7, chance: 0.3 }
    },
    rare: {
        exoticMinerals: { min: 1, max: 3, chance: 0.15 },
        energyCrystals: { min: 1, max: 2, chance: 0.1 }
    },
    veryRare: {
        ancientArtifacts: { min: 1, max: 1, chance: 0.05 },
        antimatterCores: { min: 1, max: 1, chance: 0.02 }
    }
};

// Asteroid class to encapsulate asteroid behavior
class Asteroid {
    constructor(position, level = this.getRandomLevel()) {
        this.level = level;
        this.radius = ASTEROID_CONFIG.baseRadius;
        this.maxHealth = ASTEROID_CONFIG.healthVariation[level];
        this.health = this.maxHealth;
        this.contents = this.generateContents();
        this.asteroidGroup = new paper.Group(); // Create empty group first
        this.createAsteroidGraphics(position);
    }

    getRandomLevel() {
        // 60% low, 30% medium, 10% high level asteroids
        const random = Math.random();
        if (random < 0.6) return 'low';
        if (random < 0.9) return 'medium';
        return 'high';
    }

    createAsteroidGraphics(position) {
        // Load the appropriate SVG sprite based on asteroid level
        const spritePath = ASTEROID_CONFIG.spritePaths[this.level];
        
        paper.project.importSVG(spritePath, (item) => {
            // Adjust size if needed
            const scale = this.radius / 25; // Assuming the SVG is designed for a 25px base radius
            item.scale(scale);
            
            // Add the SVG to the group
            this.asteroidGroup.addChild(item);
            
            // Add health display text
            this.healthText = new paper.PointText({
                point: new paper.Point(0, 0),
                content: `${this.health}/${this.maxHealth}`,
                fillColor: 'white',
                fontFamily: 'Courier New',
                fontSize: 10,
                justification: 'center'
            });
            this.asteroidGroup.addChild(this.healthText);
            
            // Position the asteroid
            this.asteroidGroup.position = position;
        });
    }

    generateContents() {
        const contents = {};
        
        // Generate common resources
        for (const [type, resource] of Object.entries(RESOURCE_TYPES.common)) {
            if (Math.random() < resource.chance) {
                const amount = Math.floor(Math.random() * (resource.max - resource.min + 1)) + resource.min;
                contents[type] = amount;
            }
        }
        
        // Generate uncommon resources
        for (const [type, resource] of Object.entries(RESOURCE_TYPES.uncommon)) {
            if (Math.random() < resource.chance) {
                const amount = Math.floor(Math.random() * (resource.max - resource.min + 1)) + resource.min;
                contents[type] = amount;
            }
        }
        
        // Generate rare resources
        for (const [type, resource] of Object.entries(RESOURCE_TYPES.rare)) {
            if (Math.random() < resource.chance) {
                const amount = Math.floor(Math.random() * (resource.max - resource.min + 1)) + resource.min;
                contents[type] = amount;
            }
        }
        
        // Generate very rare resources
        for (const [type, resource] of Object.entries(RESOURCE_TYPES.veryRare)) {
            if (Math.random() < resource.chance) {
                const amount = Math.floor(Math.random() * (resource.max - resource.min + 1)) + resource.min;
                contents[type] = amount;
            }
        }
        
        return contents;
    }

    attemptExtraction() {
        if (this.health <= 0) return false;
        
        this.health -= 1;
        this.updateHealthDisplay();
        
        // Check if asteroid is destroyed
        if (this.health <= 0) {
            return true; // Signal that the asteroid was destroyed
        }
        
        return false; // Asteroid still has health
    }

    updateHealthDisplay() {
        if (this.healthText) {
            this.healthText.content = `${this.health}/${this.maxHealth}`;
            
            // Update visual appearance based on damage percentage
            const damagePercent = 1 - (this.health / this.maxHealth);
            
            // Make the asteroid look more damaged as health decreases
            this.asteroidGroup.opacity = 1 - (damagePercent * 0.3); // Fade slightly
            
            // Add "cracks" or damage indicators if they weren't already visualized in the sprite
            if (damagePercent > 0.3 && !this.crackLevel1) {
                this.addCracks(1);
                this.crackLevel1 = true;
            }
            
            if (damagePercent > 0.6 && !this.crackLevel2) {
                this.addCracks(2);
                this.crackLevel2 = true;
            }
        }
    }

    addCracks(level) {
        const crackGroup = new paper.Group();
        
        // Draw random cracks
        for (let i = 0; i < level * 3; i++) {
            const start = Math.random() * 2 * Math.PI;
            const length = this.radius * (0.3 + Math.random() * 0.3);
            const angle = start;
            
            const crackPath = new paper.Path();
            crackPath.strokeColor = 'white';
            crackPath.strokeWidth = 1;
            
            // Start point at some random distance from center
            const startDist = this.radius * (0.2 + Math.random() * 0.3);
            const startX = Math.cos(angle) * startDist;
            const startY = Math.sin(angle) * startDist;
            
            // End point
            const endX = Math.cos(angle) * (startDist + length);
            const endY = Math.sin(angle) * (startDist + length);
            
            // Create a slightly jagged line for the crack
            crackPath.add(new paper.Point(startX, startY));
            
            // Add 1-3 intermediate points to make the crack jagged
            const segments = 1 + Math.floor(Math.random() * 3);
            for (let j = 1; j <= segments; j++) {
                const segmentDist = startDist + (length * j / (segments + 1));
                const variance = this.radius * 0.1;
                const segmentX = Math.cos(angle) * segmentDist + (Math.random() * variance - variance/2);
                const segmentY = Math.sin(angle) * segmentDist + (Math.random() * variance - variance/2);
                crackPath.add(new paper.Point(segmentX, segmentY));
            }
            
            crackPath.add(new paper.Point(endX, endY));
            crackGroup.addChild(crackPath);
        }
        
        this.asteroidGroup.addChild(crackGroup);
    }

    generateLoot() {
        return this.contents;
    }

    getPosition() {
        return this.asteroidGroup.position;
    }

    getRadius() {
        return this.radius;
    }

    isDestroyed() {
        return this.health <= 0;
    }
}

// Export the Asteroid class and config for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Asteroid, ASTEROID_CONFIG, RESOURCE_TYPES };
} 