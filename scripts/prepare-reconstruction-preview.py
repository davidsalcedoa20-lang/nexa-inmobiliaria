"""Convert a COLMAP textured PLY into a web GLB and render review images.

Run with Blender in background mode. This script intentionally has no project or
provider-specific dependencies so it can later sit behind a reconstruction
provider implementation.
"""

import argparse
import math
from pathlib import Path

import bpy
from mathutils import Vector


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mesh", required=True)
    parser.add_argument("--texture", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--target-faces", type=int, default=150_000)
    return parser.parse_args(__import__("sys").argv[__import__("sys").argv.index("--") + 1 :])


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def look_at(camera: bpy.types.Object, point: Vector) -> None:
    camera.rotation_euler = (point - camera.location).to_track_quat("-Z", "Y").to_euler()


def add_material(mesh_object: bpy.types.Object, texture_path: Path) -> None:
    material = bpy.data.materials.new("Reconstruction material")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    image_node = nodes.new("ShaderNodeTexImage")
    image_node.image = bpy.data.images.load(str(texture_path), check_existing=True)
    image_node.interpolation = "Linear"
    principled = next((node for node in nodes if node.type == "BSDF_PRINCIPLED"), None)
    if principled is None:
        principled = nodes.new("ShaderNodeBsdfPrincipled")
    material.node_tree.links.new(image_node.outputs["Color"], principled.inputs["Base Color"])
    material.node_tree.links.new(image_node.outputs["Alpha"], principled.inputs["Alpha"])
    principled.inputs["Roughness"].default_value = 0.75
    mesh_object.data.materials.clear()
    mesh_object.data.materials.append(material)


def simplify_mesh(mesh_object: bpy.types.Object, target_faces: int) -> None:
    face_count = len(mesh_object.data.polygons)
    if target_faces <= 0 or face_count <= target_faces:
        return
    modifier = mesh_object.modifiers.new("Web preview simplification", type="DECIMATE")
    modifier.decimate_type = "COLLAPSE"
    modifier.ratio = target_faces / face_count
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = mesh_object
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def scene_bounds(mesh_object: bpy.types.Object) -> tuple[Vector, Vector, Vector, float]:
    corners = [mesh_object.matrix_world @ Vector(corner) for corner in mesh_object.bound_box]
    minimum = Vector(tuple(min(c[i] for c in corners) for i in range(3)))
    maximum = Vector(tuple(max(c[i] for c in corners) for i in range(3)))
    center = (minimum + maximum) / 2
    extent = max(maximum[i] - minimum[i] for i in range(3))
    return minimum, maximum, center, extent


def add_camera(center: Vector, extent: float, azimuth_degrees: float, elevation: float) -> bpy.types.Object:
    angle = math.radians(azimuth_degrees)
    distance = max(extent * 1.65, 0.1)
    camera_data = bpy.data.cameras.new(f"Camera {azimuth_degrees:g}")
    camera_data.lens = 50
    camera = bpy.data.objects.new(camera_data.name, camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = center + Vector((math.cos(angle) * distance, math.sin(angle) * distance, extent * elevation))
    look_at(camera, center)
    bpy.context.scene.camera = camera
    return camera


def add_lighting(center: Vector, extent: float) -> None:
    world = bpy.context.scene.world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.055, 0.07, 0.09, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.65

    light_data = bpy.data.lights.new("Softbox", type="AREA")
    light_data.energy = 900
    light_data.shape = "DISK"
    light_data.size = max(extent * 1.5, 1)
    light = bpy.data.objects.new("Softbox", light_data)
    bpy.context.collection.objects.link(light)
    light.location = center + Vector((extent, -extent, extent * 1.5))


def render_views(output_dir: Path, center: Vector, extent: float) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 900
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    for index, azimuth in enumerate((45, 165, 285), start=1):
        camera = add_camera(center, extent, azimuth, 0.45)
        scene.render.filepath = str(output_dir / f"preview-{index}.png")
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(camera, do_unlink=True)


def main() -> None:
    args = parse_args()
    mesh_path = Path(args.mesh).resolve()
    texture_path = Path(args.texture).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    clear_scene()
    if mesh_path.suffix.lower() == ".obj":
        bpy.ops.wm.obj_import(filepath=str(mesh_path))
    else:
        bpy.ops.wm.ply_import(filepath=str(mesh_path))
    mesh_object = bpy.context.active_object
    if mesh_object is None or mesh_object.type != "MESH":
        raise RuntimeError("Blender did not import a mesh from the PLY file")
    if not mesh_object.data.uv_layers:
        raise RuntimeError("The textured PLY did not provide a UV layer")

    add_material(mesh_object, texture_path)
    simplify_mesh(mesh_object, args.target_faces)
    minimum, maximum, center, extent = scene_bounds(mesh_object)
    print(
        "RECONSTRUCTION_INFO",
        {
            "vertices": len(mesh_object.data.vertices),
            "faces": len(mesh_object.data.polygons),
            "uv_layers": len(mesh_object.data.uv_layers),
            "minimum": tuple(round(value, 4) for value in minimum),
            "maximum": tuple(round(value, 4) for value in maximum),
        },
    )

    add_lighting(center, extent)
    render_views(output_dir, center, extent)

    bpy.context.view_layer.objects.active = mesh_object
    mesh_object.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(output_dir / "reconstruction.glb"),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
    )
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / "reconstruction-review.blend"))


if __name__ == "__main__":
    main()
