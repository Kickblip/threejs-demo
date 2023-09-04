import * as THREE from "three"
import { Vector2 } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPixelatedPass } from "./RenderPixelatedPass.js"

let screenResolution, camera, scene, renderer, composer, renderPixelatedPass, controls, crystalMesh, playerMesh, velocity, damping
const keysPressed = new Set()

init()
animate()

function onWindowResize() {
    screenResolution.set(window.innerWidth, window.innerHeight)
    const aspectRatio = screenResolution.x / screenResolution.y
    camera.left = -aspectRatio
    camera.right = aspectRatio
    camera.updateProjectionMatrix()
    renderer.setSize(screenResolution.x, screenResolution.y)
    renderPixelatedPass.setSize(screenResolution.x, screenResolution.y)
}

function init() {
    screenResolution = new Vector2(window.innerWidth, window.innerHeight)
    const aspectRatio = screenResolution.x / screenResolution.y

    camera = new THREE.OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0.1, 10)
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x151729)

    renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.shadowMap.enabled = true
    renderer.setSize(screenResolution.x, screenResolution.y)
    document.body.appendChild(renderer.domElement)

    composer = new EffectComposer(renderer)
    renderPixelatedPass = new RenderPixelatedPass(
        screenResolution,
        3, // pixelSize
        scene,
        camera,
    )
    composer.addPass(renderPixelatedPass)

    window.addEventListener("resize", onWindowResize)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enabled = true // Disable manual camera movements
    controls.target.set(0, 0, 0)
    camera.position.z = 2
    camera.position.y = 2 * Math.tan(Math.PI / 6)
    controls.update()
    // controls.minPolarAngle = controls.maxPolarAngle = controls.getPolarAngle();

    const texLoader = new THREE.TextureLoader()
    const tex_checker = pixelTexture(texLoader.load("/checker.png"))
    const tex_checker2 = pixelTexture(texLoader.load("/checker.png"))
    tex_checker.repeat.set(3, 3)
    tex_checker2.repeat.set(1.5, 1.5)

    // Setup geometry
    const boxMaterial = new THREE.MeshPhongMaterial({ map: tex_checker2 })
    function addBox(boxSideLength, x, z, rotation) {
        let mesh = new THREE.Mesh(new THREE.BoxGeometry(boxSideLength, boxSideLength, boxSideLength), boxMaterial)
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.rotation.y = rotation
        mesh.position.y = boxSideLength / 2
        mesh.position.set(x, boxSideLength / 2 + 0.0001, z)
        scene.add(mesh)
        return mesh
    }
    addBox(0.4, 0, 0, Math.PI / 4)
    addBox(0.5, -0.5, -0.5, Math.PI / 4)
    addBox(0.3, 0.6, 0.6, Math.PI / 4)

    const planeSideLength = 2
    const planeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(planeSideLength, planeSideLength),
        new THREE.MeshPhongMaterial({ map: tex_checker }),
    )
    planeMesh.receiveShadow = true
    planeMesh.rotation.x = -Math.PI / 2
    scene.add(planeMesh)

    const radius = 0.2
    const crystalGeometry = new THREE.IcosahedronGeometry(radius)
    crystalMesh = new THREE.Mesh(
        crystalGeometry,
        new THREE.MeshPhongMaterial({
            color: 0x2379cf,
            emissive: 0x143542,
            shininess: 10,
            specular: 0xffffff,
        }),
    )
    crystalMesh.receiveShadow = true
    crystalMesh.castShadow = true
    scene.add(crystalMesh)

    velocity = new THREE.Vector3(0, 0, 0)
    damping = 0.9

    const playerGeometry = new THREE.SphereGeometry(0.1, 32, 32)

    playerMesh = new THREE.Mesh(
        playerGeometry,
        new THREE.MeshPhongMaterial({
            color: 0xff00ff,
            emissive: 0x3e133e,
            shininess: 10,
            specular: 0xffffff,
        }),
    )
    playerMesh.receiveShadow = true
    playerMesh.castShadow = true
    playerMesh.position.x = 0.4
    playerMesh.position.z = 0.3
    playerMesh.position.y = 0.1
    scene.add(playerMesh)

    // Setup lights
    scene.add(new THREE.AmbientLight(0x2d3645, 1.5))

    const directionalLight = new THREE.DirectionalLight(0xfffc9c, 0.5)
    directionalLight.position.set(100, 100, 100)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(2048, 2048)
    scene.add(directionalLight)

    const spotLight = new THREE.SpotLight(0xff8800, 1.5, 10, Math.PI / 16, 0.02, 2)
    spotLight.position.set(2, 2, 0)
    const target = spotLight.target
    scene.add(target)
    target.position.set(0, 0, 0)
    spotLight.castShadow = true
    scene.add(spotLight)
}

function animate() {
    requestAnimationFrame(animate)
    const t = performance.now() / 1000
    crystalMesh.material.emissiveIntensity = Math.sin(t * 3) * 0.5 + 0.5
    crystalMesh.position.y = 0.7 + Math.sin(t * 2) * 0.05
    crystalMesh.rotation.y = stopGoEased(t, 2, 4) * 2 * Math.PI

    const acceleration = 0.01
    if (keysPressed.size === 0) {
        velocity.set(0, 0, 0) // Reset velocity when no keys are pressed
    } else {
        if (keysPressed.has("w")) {
            velocity.z -= acceleration
        }
        if (keysPressed.has("a")) {
            velocity.x -= acceleration
        }
        if (keysPressed.has("s")) {
            velocity.z += acceleration
        }
        if (keysPressed.has("d")) {
            velocity.x += acceleration
        }
    }

    // Normalize vector to get a constant speed
    velocity.normalize().multiplyScalar(acceleration)

    // Update the sphere position
    playerMesh.position.add(velocity)

    // Apply damping (to slow down over time)
    velocity.multiplyScalar(damping)

    // composer.render()
    renderer.render(scene, camera)
}

// Handle Keyboard Input
document.addEventListener("keydown", function (event) {
    keysPressed.add(event.key)
})

document.addEventListener("keyup", function (event) {
    keysPressed.delete(event.key)
})

// Helper functions

function pixelTexture(texture) {
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    texture.generateMipmaps = false
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    return texture
}

function easeInOutCubic(x) {
    return x ** 2 * 3 - x ** 3 * 2
}

function clamp(x, min, max) {
    return Math.min(max, Math.max(min, x))
}

function linearStep(x, edge0, edge1) {
    const w = edge1 - edge0
    const m = 1 / w
    const y0 = -m * edge0
    return clamp(y0 + m * x, 0, 1)
}

function stopGoEased(x, downtime, period) {
    const cycle = (x / period) | 0
    const tween = x - cycle * period
    const linStep = easeInOutCubic(linearStep(tween, downtime, period))
    return cycle + linStep
}
