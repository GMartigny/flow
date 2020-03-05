import { Scene, Container, Circle, Particles, Slider, Text, Math as M, MouseEvent } from "https://unpkg.com/pencil.js@1.15.0/dist/pencil.esm.js";
import QuadTree, { Bound } from "./quadtree.js";
import Position from "./position.js";

// Add a button asking for full-screen
const askForFullScreen = async () => new Promise((resolve) => {
    const button = document.createElement("button");
    button.textContent = "Start";
    document.body.appendChild(button);
    button.addEventListener("click", () => {
        resolve(document.documentElement.requestFullscreen());
        button.remove();
    });
});

// Wait for next frame
const nextFrame = () => new Promise((resolve) => {
    requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
    });
});

// Apply Verlet integration to simulate movement
const friction = 0.005; // Air friction
const verlet = (component, getForces) => {
    const previous = component.position.clone();

    if (component.previousPosition) {
        const speed = new Position(component.position.x, component.position.y)
            .subtract(component.previousPosition)
            .multiply(1 - friction);
        const max = 10;
        const speedStrength = speed.length;
        if (speedStrength > max) {
            speed.multiply(max / speedStrength);
        }
        component.position.add(speed);

        component.previousPosition.set(previous);
    }
    else {
        component.previousPosition = previous;
    }

    component.position.add(getForces());
};

(async () => {
    // Device acceleration
    const acceleration = new Position();
    // Device orientation
    const orientation = new Position(0, 1);

    let scene;

    const isHandHeld = Boolean(navigator.maxTouchPoints);
    if (isHandHeld) {
        const g = 9.80665;

        // Read accelerometer values
        const laSensor = new LinearAccelerationSensor({
            frequency: 60,
        });
        laSensor.addEventListener("reading", () => {
            acceleration.set(-laSensor.x / (g / 4), laSensor.y / (g / 4));
        });
        laSensor.start();

        // Read gyroscope values
        const accelerometer = new Accelerometer({
            frequency: 60,
        });
        accelerometer.addEventListener("reading", () => {
            orientation.set(-accelerometer.x / g, accelerometer.y / g);
        });
        accelerometer.start();

        // Go full-screen, this is required to lock screen rotation
        await askForFullScreen();
        // Wait for screen size to update
        await nextFrame();

        // Lock screen rotation
        await screen.orientation.lock("portrait-primary");

        scene = new Scene();
    }
    else {
        scene = new Scene();
        scene.on(MouseEvent.events.move, () => {
            const { cursorPosition, center, width, height } = scene;
            orientation.set(cursorPosition.clone().subtract(center).multiply(0.5 / width, 0.5 / height));
        }, true);
    }

    const bounce = 0.5; // Bounce strength
    const gravity = 0.4; // Gravity constant

    const quadTree = new QuadTree(new Bound(0, 0, scene.width, scene.height));

    const nbParticles = Math.round((scene.width * scene.height) / 1000);
    const base = new Circle(undefined, 6, {
        fill: "#1c79ff",
    });
    const liquid = new Particles(undefined, base, nbParticles, () => ({
        position: new Position(M.random(scene.width), M.random(scene.height)),
    }), (particle) => {
        verlet(particle, () => {
            const forces = new Position();

            forces
                .add(orientation.clone().multiply(gravity))
                .add(acceleration.clone().multiply(gravity));

            const { position } = particle;
            const { radius } = base;
            const tmp = new Position();

            // Bounce on walls
            [
                [position.x, 0, position.y], // left
                [position.y, position.x, 0], // top
                [scene.width - position.x, scene.width, position.y], // right
                [scene.height - position.y, position.x, scene.height], // bottom
            ].forEach(([distance, x, y]) => {
                if (distance < radius) {
                    forces.add(tmp.set(position)
                        .subtract(x, y)
                        .multiply(1 / distance)
                        .multiply((distance - radius) * (-bounce)));
                }
            });

            // Bounce off neighbors
            const neighbors = quadTree.get(new Bound(position.x - (radius * 2), position.y - (radius * 2), radius * 4, radius * 4));
            neighbors.forEach((other) => {
                if (other !== position) {
                    const distance = position.distance(other);
                    const field = radius * 2;
                    if (distance < field) {
                        const pushBack = tmp.set(position)
                            .subtract(other)
                            .multiply(1 / distance)
                            .multiply((distance - field) * (-bounce / 2));
                        forces.add(pushBack);
                        other.subtract(pushBack);
                    }
                }
            });

            return forces;
        });
    });

    // Debug
    const debug = new Container([10, 10]);

    const slider = new Slider(undefined, {
        min: 0.3,
        max: 4,
        value: 1,
    });
    slider.on(Slider.events.change, () => {
        const objective = Math.round(slider.value * nbParticles);
        const diff = objective - liquid.data.length;

        // Add
        if (diff > 0) {
            for (let i = 0; i < diff; ++i) {
                liquid.data.push({
                    ...Particles.defaultData,
                    position: scene.getRandomPosition(),
                });
            }
        }
        // Remove
        else if (diff < 0) {
            liquid.data.splice(0, -diff);
        }
    });

    const debugText = new Text([slider.width + 10, 0]);
    debug.add(debugText, slider).hide();

    scene
        .add(liquid, debug)
        .startLoop()
        .on(Scene.events.draw, () => {
            const { width, height } = scene;

            if (debug.options.shown) {
                debugText.text = liquid.data.length;
            }

            quadTree.reset(new Bound(0, 0, width, height));
            liquid.data.forEach(particle => quadTree.add(particle.position));
        }, true)
        .on("click", () => {
            debug[debug.options.shown ? "hide" : "show"]();
        }, true);
})();
