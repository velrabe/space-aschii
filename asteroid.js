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
        this.asteroidGroup = this.createAsteroidGraphics(position);
    }

    getRandomLevel() {
        // 60% low, 30% medium, 10% high level asteroids
        const random = Math.random();
        if (random < 0.6) return 'low';
        if (random < 0.9) return 'medium';
        return 'high';
    }

    createAsteroidGraphics(position) {
        const asteroid = new paper.Group();
        
        // Create main circle with color based on level
        const circle = new paper.Path.Circle({
            center: new paper.Point(0, 0),
            radius: this.radius,
            strokeColor: ASTEROID_CONFIG.colors[this.level],
            strokeWidth: 2
        });
        
        // Add some ASCII-style details (*)
        const crossH = new paper.Path.Line(
            new paper.Point(-this.radius * 0.7, 0),
            new paper.Point(this.radius * 0.7, 0)
        );
        crossH.strokeColor = ASTEROID_CONFIG.colors[this.level];
        crossH.strokeWidth = 2;
        
        const crossV = new paper.Path.Line(
            new paper.Point(0, -this.radius * 0.7),
            new paper.Point(0, this.radius * 0.7)
        );
        crossV.strokeColor = ASTEROID_CONFIG.colors[this.level];
        crossV.strokeWidth = 2;
        
        const crossD1 = new paper.Path.Line(
            new paper.Point(-this.radius * 0.5, -this.radius * 0.5),
            new paper.Point(this.radius * 0.5, this.radius * 0.5)
        );
        crossD1.strokeColor = ASTEROID_CONFIG.colors[this.level];
        crossD1.strokeWidth = 2;
        
        const crossD2 = new paper.Path.Line(
            new paper.Point(-this.radius * 0.5, this.radius * 0.5),
            new paper.Point(this.radius * 0.5, -this.radius * 0.5)
        );
        crossD2.strokeColor = ASTEROID_CONFIG.colors[this.level];
        crossD2.strokeWidth = 2;
        
        asteroid.addChild(circle);
        asteroid.addChild(crossH);
        asteroid.addChild(crossV);
        asteroid.addChild(crossD1);
        asteroid.addChild(crossD2);
        
        // Add text to show health status
        this.healthText = new paper.PointText({
            point: new paper.Point(0, 0),
            content: `${this.health}/${this.maxHealth}`,
            fillColor: 'white',
            fontFamily: 'Courier New',
            fontSize: 10,
            justification: 'center'
        });
        asteroid.addChild(this.healthText);
        
        asteroid.position = position;
        return asteroid;
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
        this.healthText.content = `${this.health}/${this.maxHealth}`;
        
        // Update visual appearance based on damage percentage
        const damagePercent = 1 - (this.health / this.maxHealth);
        
        // Make the asteroid look more damaged as health decreases
        this.asteroidGroup.opacity = 1 - (damagePercent * 0.3); // Fade slightly
        
        // Add "cracks" or damage indicators
        if (damagePercent > 0.3 && !this.crackLevel1) {
            this.addCracks(1);
            this.crackLevel1 = true;
        }
        
        if (damagePercent > 0.6 && !this.crackLevel2) {
            this.addCracks(2);
            this.crackLevel2 = true;
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
            
            const startPoint = new paper.Point(
                Math.cos(angle) * this.radius * 0.5,
                Math.sin(angle) * this.radius * 0.5
            );
            
            const endPoint = new paper.Point(
                startPoint.x + Math.cos(angle) * length,
                startPoint.y + Math.sin(angle) * length
            );
            
            crackPath.add(startPoint);
            
            // Add some randomness to the crack
            const midPoint1 = new paper.Point(
                startPoint.x + (endPoint.x - startPoint.x) * 0.33 + (Math.random() - 0.5) * 5,
                startPoint.y + (endPoint.y - startPoint.y) * 0.33 + (Math.random() - 0.5) * 5
            );
            
            const midPoint2 = new paper.Point(
                startPoint.x + (endPoint.x - startPoint.x) * 0.66 + (Math.random() - 0.5) * 5,
                startPoint.y + (endPoint.y - startPoint.y) * 0.66 + (Math.random() - 0.5) * 5
            );
            
            crackPath.add(midPoint1);
            crackPath.add(midPoint2);
            crackPath.add(endPoint);
            
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