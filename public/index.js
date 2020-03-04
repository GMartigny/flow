import { Scene, Circle, Position, Particles, Text, Math as M } from "./modules/pencil.js";
import QuadTree, { Bound } from "./quadtree.js";

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
        component.position.add(
            component.position.clone()
                .subtract(component.previousPosition)
                .multiply(1 - friction),
        );

        component.previousPosition.set(previous);
    }
    else {
        component.previousPosition = previous;
    }

    component.position.add(getForces());
};

(async () => {
    await askForFullScreen();
    await nextFrame();
    await screen.orientation.lock("portrait-primary");

    const scene = new Scene();

    const bounce = 0.4; // Bounce strength
    const gravity = 0.08; // Gravity constant
    const orientation = new Position(0, 1); // Device orientation
    const accelerometer = new Accelerometer({
        frequency: 60,
    });

    accelerometer.addEventListener("reading", () => {
        orientation.set(-accelerometer.x / 10, accelerometer.y / 10);
    });
    accelerometer.start();

    const quadTree = new QuadTree(new Bound(0, 0, scene.width, scene.height));

    const nbParticles = 500;
    const base = new Circle(undefined, 6, {
        fill: "#1c79ff",
    });
    const liquid = new Particles(undefined, base, nbParticles, () => ({
        position: scene.getRandomPosition(),
    }), (particle) => {
        verlet(particle, () => {
            const forces = new Position();

            forces.add(orientation.clone().multiply(gravity));

            const { position } = particle;
            const { radius } = base;
            // Bounce on walls
            [
                [position.x, 0, position.y], // left
                [position.y, position.x, 0], // top
                [scene.width - position.x, scene.width, position.y], // right
                [scene.height - position.y, position.x, scene.height], // bottom
            ].forEach(([distance, x, y]) => {
                if (distance < radius) {
                    forces.add(position.clone()
                        .subtract(x, y)
                        .divide(distance)
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
                        const pushBack = position.clone()
                            .subtract(other)
                            .divide(distance)
                            .multiply((distance - field) * (-bounce / 2));
                        forces.add(pushBack);
                        other.add(pushBack.multiply(-1));
                    }
                }
            });

            return forces;
        });
    });

    const debug = new Text([10, 10]);
    debug.hide();

    const precision = 3;
    const fps = [];
    scene
        .add(liquid, debug)
        .startLoop()
        .on(Scene.events.draw, () => {
            fps.push(scene.fps);
            if (fps.length > 60) {
                fps.splice(0, 1);
            }
            const mean = M.average(...fps);

            if (debug.options.shown && scene.frameCount % 20 === 0) {
                debug.text = `${mean.toFixed(1)}
${liquid.data.length}`;
            }

            if (mean > 55) {
                for (let i = 0; i < precision; ++i) {
                    liquid.data.push({
                        ...Particles.defaultData,
                        position: scene.getRandomPosition(),
                    });
                }
            }
            else if (mean < 45) {
                liquid.data.splice(0, precision);
            }

            const { width, height } = scene;
            quadTree.reset(new Bound(0, 0, width, height));
            liquid.data.forEach(particle => quadTree.add(particle.position));
        }, true)
        .on("click", () => {
            debug[debug.options.shown ? "hide" : "show"]();
        }, true);
})();
