import * as THREE from "three"
import { ColladaLoader } from "/node_modules/three/examples/jsm/loaders/ColladaLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPixelatedPass } from "./pass/RenderPixelatedPass.js"
import { OutputPass } from "./pass/OutputPass.js"

let camera, scene, renderer, composer, crystalMesh, clock, playerMesh, velocity, damping
const keysPressed = new Set()
const pixelSize = 5
const acceleration = 0.013 // Acceleration of the player
const colladaLoader = new ColladaLoader()

init()
animate()

function init() {
    const aspectRatio = window.innerWidth / window.innerHeight

    camera = new THREE.OrthographicCamera(-aspectRatio, aspectRatio, 1, -1, 0.1, 10)
    camera.position.y = 2.5 * Math.tan(Math.PI / 6)
    camera.position.z = 2
    camera.lookAt(0, 0, 0)

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x151729)

    clock = new THREE.Clock()

    renderer = new THREE.WebGLRenderer()
    renderer.shadowMap.enabled = true
    //renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(window.innerWidth, window.innerHeight)
    document.body.appendChild(renderer.domElement)

    composer = new EffectComposer(renderer)
    const renderPixelatedPass = new RenderPixelatedPass(pixelSize, scene, camera)
    composer.addPass(renderPixelatedPass)

    const outputPass = new OutputPass()
    composer.addPass(outputPass)

    window.addEventListener("resize", onWindowResize)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enabled = true // Enable or disable manual camera movements
    controls.maxZoom = 2

    // textures

    const loader = new THREE.TextureLoader()
    const texChecker = pixelTexture(loader.load("/checker.png"))
    const texChecker2 = pixelTexture(loader.load("/checker.png"))
    const treeTexture0 = loader.load("/treeMeshes/Colorsheet-Tree-Normal.png")
    const treeTexture1 = loader.load("/treeMeshes/Colorsheet-Tree-Dry.png")
    const treeTexture2 = loader.load("/treeMeshes/Colorsheet-Tree-Cold.png")
    const treeTexture3 = loader.load("/treeMeshes/Colorsheet-Tree-Fall.png")
    texChecker.repeat.set(3, 3)
    texChecker2.repeat.set(1.5, 1.5)

    // meshes

    const boxMaterial = new THREE.MeshPhongMaterial({ map: texChecker2 })

    function addBox(boxSideLength, x, z, rotation) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(boxSideLength, boxSideLength, boxSideLength), boxMaterial)
        mesh.castShadow = true
        mesh.receiveShadow = true
        mesh.rotation.y = rotation
        mesh.position.y = boxSideLength / 2
        mesh.position.set(x, boxSideLength / 2 + 0.0001, z)
        scene.add(mesh)
        return mesh
    }

    const planeSideLength = 2
    const planeMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(planeSideLength, planeSideLength),
        new THREE.MeshPhongMaterial({ map: texChecker }),
    )
    planeMesh.receiveShadow = true
    planeMesh.rotation.x = -Math.PI / 2
    scene.add(planeMesh)

    const radius = 0.2
    const geometry = new THREE.IcosahedronGeometry(radius)
    crystalMesh = new THREE.Mesh(
        geometry,
        new THREE.MeshPhongMaterial({
            color: 0x68b7e9,
            emissive: 0x4f7e8b,
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
    playerMesh.position.x = 0
    playerMesh.position.z = 0
    playerMesh.position.y = 0.1
    scene.add(playerMesh)

    colladaLoader.load("/treeMeshes/Tree-Type4-05.dae", (collada) => {
        const model = collada.scene
        model.position.set(1, 0, 0)
        model.scale.set(0.2, 0.2, 0.2)

        // Traverse the model to find all mesh objects
        model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                // Create a new MeshPhongMaterial with the loaded texture
                const newMaterial = new THREE.MeshPhongMaterial({ map: texChecker })

                // Apply the material to the mesh
                child.material = newMaterial
            }
        })

        scene.add(model)
    })

    // lights

    scene.add(new THREE.AmbientLight(0x757f8e, 3))

    const directionalLight = new THREE.DirectionalLight(0xfffecd, 1.5)
    directionalLight.position.set(100, 100, 100)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.set(2048, 2048)
    scene.add(directionalLight)

    const spotLight = new THREE.SpotLight(0xffc100, 10, 10, Math.PI / 16, 0.02, 2)
    spotLight.position.set(2, 2, 0)
    const target = spotLight.target
    scene.add(target)
    target.position.set(0, 0, 0)
    spotLight.castShadow = true
    scene.add(spotLight)
}

function onWindowResize() {
    const aspectRatio = window.innerWidth / window.innerHeight
    camera.left = -aspectRatio
    camera.right = aspectRatio
    camera.updateProjectionMatrix()

    renderer.setSize(window.innerWidth, window.innerHeight)
    composer.setSize(window.innerWidth, window.innerHeight)
}

function animate() {
    requestAnimationFrame(animate)

    const t = clock.getElapsedTime()

    crystalMesh.material.emissiveIntensity = Math.sin(t * 3) * 0.5 + 0.5
    crystalMesh.position.y = 0.7 + Math.sin(t * 2) * 0.05
    crystalMesh.rotation.y = stopGoEased(t, 2, 4) * 2 * Math.PI

    const rendererSize = renderer.getSize(new THREE.Vector2())
    const aspectRatio = rendererSize.x / rendererSize.y

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

    // Update the camera position
    camera.position.add(velocity)

    // Apply damping (to slow down over time)
    velocity.multiplyScalar(damping)

    composer.render()
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
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
}

function easeInOutCubic(x) {
    return x ** 2 * 3 - x ** 3 * 2
}

function linearStep(x, edge0, edge1) {
    const w = edge1 - edge0
    const m = 1 / w
    const y0 = -m * edge0
    return THREE.MathUtils.clamp(y0 + m * x, 0, 1)
}

function stopGoEased(x, downtime, period) {
    const cycle = (x / period) | 0
    const tween = x - cycle * period
    const linStep = easeInOutCubic(linearStep(tween, downtime, period))
    return cycle + linStep
}

function pixelAlignFrustum(camera, aspectRatio, pixelsPerScreenWidth, pixelsPerScreenHeight) {
    // 0. Get Pixel Grid Units
    const worldScreenWidth = (camera.right - camera.left) / camera.zoom
    const worldScreenHeight = (camera.top - camera.bottom) / camera.zoom
    const pixelWidth = worldScreenWidth / pixelsPerScreenWidth
    const pixelHeight = worldScreenHeight / pixelsPerScreenHeight

    // 1. Project the current camera position along its local rotation bases
    const camPos = new THREE.Vector3()
    camera.getWorldPosition(camPos)
    const camRot = new THREE.Quaternion()
    camera.getWorldQuaternion(camRot)
    const camRight = new THREE.Vector3(1.0, 0.0, 0.0).applyQuaternion(camRot)
    const camUp = new THREE.Vector3(0.0, 1.0, 0.0).applyQuaternion(camRot)
    const camPosRight = camPos.dot(camRight)
    const camPosUp = camPos.dot(camUp)

    // 2. Find how far along its position is along these bases in pixel units
    const camPosRightPx = camPosRight / pixelWidth
    const camPosUpPx = camPosUp / pixelHeight

    // 3. Find the fractional pixel units and convert to world units
    const fractX = camPosRightPx - Math.round(camPosRightPx)
    const fractY = camPosUpPx - Math.round(camPosUpPx)

    // 4. Add fractional world units to the left/right top/bottom to align with the pixel grid
    camera.left = -aspectRatio - fractX * pixelWidth
    camera.right = aspectRatio - fractX * pixelWidth
    camera.top = 1.0 - fractY * pixelHeight
    camera.bottom = -1.0 - fractY * pixelHeight
    camera.updateProjectionMatrix()
}
