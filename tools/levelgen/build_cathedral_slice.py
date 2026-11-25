"""Build a render-only, high-detail Cathedral Quarter entrance hall for Three.js r128.

The exported GLB contains visual meshes only: no collision, navigation, lights, or
interactive objects. Repeated architectural parts are merged into a small number
of material batches to keep the mobile draw-call cost bounded without reducing art detail.
"""
from pathlib import Path
import math
import random
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets' / 'levelgen' / 'cathedral_ground_slice.glb'
TEXTURES = ROOT / 'assets' / 'levelgen' / 'textures'
OUT.parent.mkdir(parents=True, exist_ok=True)
random.seed(8042026)

# Start-room art stays inside the 54-unit room; gameplay navigation/colliders remain the authority.
HALF = 27.0
BATCHES = {}
ALL_OBJECTS = []
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def load_texture(name, colorspace):
    image = bpy.data.images.load(str(TEXTURES / name), check_existing=True)
    image.colorspace_settings.name = colorspace
    image.pack()
    return image


albedo = load_texture('stone_albedo.png', 'sRGB')
normal = load_texture('stone_normal.png', 'Non-Color')
roughness = load_texture('stone_roughness.png', 'Non-Color')


def stone_material(name, tint, roughness_override=None, wet=False):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*tint, 1)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    nodes.clear()
    shader = nodes.new('ShaderNodeBsdfPrincipled')
    shader.location = (420, 40)
    shader.inputs['Base Color'].default_value = (*tint, 1)
    shader.inputs['Metallic'].default_value = 0.02 if not wet else 0.07
    shader.inputs['Roughness'].default_value = 0.38 if wet else 0.88
    uv = nodes.new('ShaderNodeTexCoord')
    uv.location = (-720, 80)
    mapping = nodes.new('ShaderNodeVectorMath')
    mapping.operation = 'SCALE'
    mapping.inputs[3].default_value = 0.34
    mapping.location = (-510, 80)
    links.new(uv.outputs['UV'], mapping.inputs[0])
    color_tex = nodes.new('ShaderNodeTexImage')
    color_tex.image = albedo
    color_tex.extension = 'REPEAT'
    color_tex.location = (-280, 220)
    links.new(mapping.outputs['Vector'], color_tex.inputs['Vector'])
    tint_node = nodes.new('ShaderNodeMixRGB')
    tint_node.blend_type = 'MULTIPLY'
    tint_node.inputs[0].default_value = 1.0
    tint_node.inputs[2].default_value = (*tint, 1)
    tint_node.location = (70, 220)
    links.new(color_tex.outputs['Color'], tint_node.inputs[1])
    links.new(tint_node.outputs['Color'], shader.inputs['Base Color'])
    rough_tex = nodes.new('ShaderNodeTexImage')
    rough_tex.image = roughness
    rough_tex.extension = 'REPEAT'
    rough_tex.location = (-280, -20)
    links.new(mapping.outputs['Vector'], rough_tex.inputs['Vector'])
    if roughness_override is None:
        links.new(rough_tex.outputs['Color'], shader.inputs['Roughness'])
    else:
        shader.inputs['Roughness'].default_value = roughness_override
    normal_tex = nodes.new('ShaderNodeTexImage')
    normal_tex.image = normal
    normal_tex.extension = 'REPEAT'
    normal_tex.location = (-280, -260)
    links.new(mapping.outputs['Vector'], normal_tex.inputs['Vector'])
    normal_node = nodes.new('ShaderNodeNormalMap')
    normal_node.inputs['Strength'].default_value = 0.42 if wet else 0.56
    normal_node.location = (100, -190)
    links.new(normal_tex.outputs['Color'], normal_node.inputs['Color'])
    links.new(normal_node.outputs['Normal'], shader.inputs['Normal'])
    output = nodes.new('ShaderNodeOutputMaterial')
    output.location = (680, 40)
    links.new(shader.outputs['BSDF'], output.inputs['Surface'])
    return mat


stone = stone_material('Cathedral stone | cold blue-grey PBR', (0.72, 0.77, 0.84))
trim = stone_material('Cathedral carved limestone | PBR', (0.92, 0.91, 0.86))
wet_stone = stone_material('Wet floor stone | PBR', (0.34, 0.42, 0.52), 0.18, wet=True)
metal = bpy.data.materials.new('Aged brass | lantern details')
metal.diffuse_color = (0.36, 0.22, 0.09, 1)
metal.use_nodes = True
metal_bsdf = metal.node_tree.nodes.get('Principled BSDF')
metal_bsdf.inputs['Base Color'].default_value = (0.36, 0.22, 0.09, 1)
metal_bsdf.inputs['Metallic'].default_value = 0.76
metal_bsdf.inputs['Roughness'].default_value = 0.34


def simple_emission(name, color, strength, rough=0.42):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = rough
    if 'Emission Color' in shader.inputs:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = strength
    else:
        shader.inputs['Emission'].default_value = (*color, 1)
    return mat


glass = simple_emission('Moonlit leaded glass', (0.17, 0.31, 0.48), 0.62, 0.23)
flame = simple_emission('Warm amber flame', (1.0, 0.33, 0.065), 3.2, 0.25)


def batch(obj, material):
    if obj.type == 'CURVE':
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target='MESH')
        obj = bpy.context.view_layer.objects.active
        obj.select_set(False)
    if obj.type == 'MESH' and not obj.data.uv_layers:
        mesh_uv_physical_scale(obj)
    obj.name = material.name + ' detail'
    if obj.data.materials.find(material.name) < 0:
        obj.data.materials.append(material)
    # All primitives are assigned one material, simplifying the final GLB batches.
    if obj.type == 'MESH':
        for polygon in obj.data.polygons:
            polygon.material_index = 0
    BATCHES.setdefault(material.name, []).append(obj)
    ALL_OBJECTS.append(obj)
    return obj


def mesh_uv_physical_scale(obj, density=0.34):
    """UV-map primitive faces in local physical units so the stone maps tile naturally."""
    mesh = obj.data
    if not mesh.uv_layers:
        mesh.uv_layers.new(name='UVMap')
    uv_layer = mesh.uv_layers.active.data
    for poly in mesh.polygons:
        n = poly.normal
        if abs(n.x) >= abs(n.y) and abs(n.x) >= abs(n.z):
            axes = (1, 2)
        elif abs(n.y) >= abs(n.x) and abs(n.y) >= abs(n.z):
            axes = (0, 2)
        else:
            axes = (0, 1)
        for loop_index in poly.loop_indices:
            co = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            uv_layer[loop_index].uv = (co[axes[0]] * density, co[axes[1]] * density)


def apply_modifiers(obj):
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for mod in list(obj.modifiers):
        try:
            bpy.ops.object.modifier_apply(modifier=mod.name)
        except RuntimeError:
            obj.modifiers.remove(mod)
    obj.select_set(False)


def box(name, loc, size, material, bevel=0.0, yaw=0.0):
    # API locations/scales are Three.js x/up/z. Blender uses x/-z/y (Z-up).
    x, y, z = loc
    sx, sy, sz = size
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (sx, sz, sy)
    obj.rotation_euler[2] = yaw
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('Soft chipped arris', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    mesh_uv_physical_scale(obj)
    apply_modifiers(obj)
    return batch(obj, material)


def cylinder(name, loc, radius, depth, material, vertices=20, bevel=0.035):
    x, y, z = loc
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=(x, -z, y))
    obj = bpy.context.object
    obj.name = name
    if bevel:
        mod = obj.modifiers.new('Soft stone arris', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
    mesh_uv_physical_scale(obj, 0.22)
    apply_modifiers(obj)
    return batch(obj, material)


def sphere(name, loc, scale, material, segments=12, rings=8):
    x, y, z = loc
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=(x, -z, y))
    obj = bpy.context.object
    obj.name = name
    obj.scale = (scale[0], scale[2], scale[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return batch(obj, material)


def arch(name, x, z, base=6.6, spring=10.3, peak=15.2, width=9.0, orientation='xz', material=trim, thickness=0.27):
    """A softly bevelled pointed arch in the X/Y plane at fixed z, or Z/Y at fixed x."""
    half = width * 0.5
    pts = [(-half, 0), (-half, spring)]
    samples = 36
    for i in range(samples + 1):
        t = i / samples
        horizontal = -half + width * t
        height = spring + (peak - spring) * (1.0 - abs(2.0 * t - 1.0) ** 1.48)
        pts.append((horizontal, height - base))
    pts.extend([(half, spring), (half, 0)])
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = thickness
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(pts) - 1)
    for point, (horizontal, vertical) in zip(spline.points, pts):
        point.co = (horizontal, 0, vertical, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    if orientation == 'xz':
        obj.location = (x, -z, base)
    else:
        obj.location = (x, -z, base)
        obj.rotation_euler[2] = math.pi / 2
    obj.data.materials.append(material)
    return batch(obj, material)


def curve_line(name, points, material, thickness=0.055):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 1
    curve.bevel_depth = thickness
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for point, (x, y, z) in zip(spline.points, points):
        point.co = (x, -z, y, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return batch(obj, material)


def pane_mesh(name, coords, z, material):
    # Coordinates are X/Y pairs; the pointed pane is an emissive, non-colliding plane.
    coords = list(reversed(coords))  # Front face points toward the playable approach (+game Z).
    verts = [(x, -z, y) for x, y in coords]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], [tuple(range(len(verts)))])
    mesh.materials.append(material)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    if mesh.uv_layers:
        pass
    uv = mesh.uv_layers.new(name='UVMap')
    for loop in mesh.loops:
        vert = mesh.vertices[loop.vertex_index].co
        uv.data[loop.index].uv = (vert.x * 0.12, vert.z * 0.12)
    return batch(obj, material)


# Repeated high Gothic piers frame the playable aisle from the stock top-side camera.
for side in (-1, 1):
    x = side * 15.5
    for z in (-18, -9, 0, 9, 18):
        box('Pier plinth', (x, 0.72, z), (4.3, 1.44, 4.0), stone, 0.15)
        box('Plinth upper torus band', (x, 1.62, z), (3.2, 0.32, 3.0), trim, 0.10)
        cylinder('Clustered pier core', (x, 5.0, z), 1.16, 8.0, stone, 24, 0.05)
        for offset in (-0.78, 0.78):
            cylinder('Pier engaged shaft', (x + offset, 5.0, z), 0.39, 7.7, trim, 16, 0.025)
        box('Pier abacus', (x, 9.18, z), (3.7, 0.56, 3.5), trim, 0.10)
        box('Pier neck shadow band', (x, 9.58, z), (2.6, 0.18, 2.5), stone, 0.04)
    # Side wall pilasters / buttress faces stay on the interior side of existing walls.
    for z in (-15, -5, 5, 15):
        box('Wall buttress', (side * 20.2, 4.7, z), (1.7, 9.4, 2.1), stone, 0.10)
        box('Buttress cap', (side * 20.2, 9.7, z), (2.5, 0.7, 3.0), trim, 0.12)
        box('Buttress foot', (side * 20.2, 0.75, z), (2.3, 1.5, 2.8), trim, 0.12)

# Transverse vault ribs and paired longitudinal ribs form a readable vaulted ceiling silhouette.
for z in (-18, -10, -2, 6, 14, 19):
    arch('Transverse pointed vault rib', 0, z, base=8.8, spring=9.6, peak=11.8, width=42.0, material=trim, thickness=0.34)
    box('Vault tie rib', (0, 9.4, z), (42.0, 0.34, 0.38), stone, 0.08)
for x in (-20, -10, 0, 10, 20):
    # Longitudinal rib curves in the same local arch plane, rotated about the vertical axis.
    for side_z in (-0.8, 0.8):
        curve = bpy.data.curves.new('Longitudinal vault rib', 'CURVE')
        curve.dimensions = '3D'
        curve.bevel_depth = 0.22
        curve.bevel_resolution = 2
        spline = curve.splines.new('POLY')
        spline.points.add(8)
        for i, p in enumerate(spline.points):
            t = i / 8
            p.co = (0, -(-20 + 40 * t), 0, 1)
        obj = bpy.data.objects.new('Longitudinal vault rib', curve)
        bpy.context.collection.objects.link(obj)
        obj.location = (x, -side_z, 10.6)
        obj.data.materials.append(trim)
        batch(obj, trim)

# Deeply moulded western / eastern arcade outlines, ornamental only and set at wall line.
for side in (-1, 1):
    for z in (-15, -5, 5, 15):
        arch('Side arcade pointed arch', side * 20.4, z, base=1.8, spring=6.6, peak=9.8, width=9.0,
             orientation='yz', material=trim, thickness=0.22)

# Entrance / far apse portals: open centre remains wide and fully traversable.
for z in (-20.3, 20.3):
    arch('Great portal archivolt', 0, z, base=0.35, spring=6.8, peak=9.8, width=15.5, material=trim, thickness=0.52)
    for side in (-1, 1):
        x = side * 7.9
        box('Portal compound jamb', (x, 4.5, z), (1.55, 8.3, 1.45), stone, 0.12)
        for offset in (-0.46, 0.0, 0.46):
            cylinder('Portal clustered colonette', (x + offset, 4.4, z), 0.22, 8.0, trim, 12, 0.018)
        box('Portal carved impost', (x, 7.1, z), (2.4, 0.66, 2.0), trim, 0.11)
        box('Portal moulded plinth', (x, 0.95, z), (2.25, 1.3, 1.9), trim, 0.12)

# Three tall leaded-glass lancets at the far end with carved surrounds and stone tracery.
for cx in (-12.5, 0, 12.5):
    z = -20.25
    half = 3.35
    base = 2.4
    spring = 6.8
    peak = 9.8
    pane_mesh('Blue moonlit lancet pane', [(cx-half, base), (cx-half, spring), (cx, peak), (cx+half, spring), (cx+half, base)], z+0.12, glass)
    arch('Lancet carved archivolt', cx, z, base=base, spring=spring, peak=peak, width=7.0, material=trim, thickness=0.26)
    for side in (-1, 1):
        box('Lancet jamb', (cx + side * half, 5.9, z), (0.55, 6.0, 0.72), trim, 0.08)
    box('Lancet sill', (cx, 3.0, z), (7.6, 0.48, 1.0), trim, 0.09)
    # Stone mullion and quatrefoil-like crossbars read as real leaded glazing from the camera.
    curve_line('Lancet central mullion', [(cx, base, z+0.19), (cx, peak-0.6, z+0.19)], trim, 0.075)
    for y in (5.2, 6.7, 8.1):
        half_width = half * min(1.0, (peak-y)/(peak-base))
        curve_line('Lancet transom', [(cx-half_width, y, z+0.2), (cx+half_width, y, z+0.2)], trim, 0.06)
    for side in (-1, 1):
        box('Window reveal deep jamb', (cx+side*4.48, 6.7, z+0.62), (0.34, 7.5, 0.42), stone, 0.06)

# Floor medallion is flush and purely decorative; player spawn and movement stay unchanged.
for radius in (3.8, 4.3, 4.8):
    pts=[]
    for i in range(65):
        a=2*math.pi*i/64
        pts.append((-6+radius*math.cos(a), 0.055, -6+radius*math.sin(a)))
    curve_line('Brass floor medallion ring', pts, metal, 0.055 if radius != 5.15 else 0.095)
for i in range(8):
    a=i*math.pi/4
    pts=[(-6+r*math.cos(a), 0.06, -6+r*math.sin(a)) for r in (0.7, 2.25, 3.75)]
    curve_line('Brass compass rose spoke', pts, metal, 0.065)
    point=(-6+3.75*math.cos(a), 0.06, -6+3.75*math.sin(a))
    box('Compass rose arrowhead', point, (0.22, 0.06, 1.05), metal, 0.02, yaw=-a)

# Wet stone puddles are shallow, sparse floor overlays concentrated beside the route edges.
for x, z, rx, rz in [(-23,-20,3.2,1.4),(22,-17,2.8,1.2),(-23,-3,1.8,1.0),(23,4,1.8,1.2),(-21,19,3.4,1.35),(20,22,2.6,1.0),(-12,-24.5,2.2,0.8),(14,-24.5,2.5,0.9)]:
    bpy.ops.mesh.primitive_circle_add(vertices=32, radius=1, fill_type='NGON', location=(x, -z, 0.028))
    obj=bpy.context.object
    obj.name='Shallow wet reflection'
    obj.scale=(rx, rz, 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    batch(obj, wet_stone)

# High-detail brass and iron wall sconces with small emissive cores; runtime lights remain unchanged.
for side in (-1, 1):
    for z in (-12, 12):
        x=side*19.4
        box('Sconce wall escutcheon', (x, 5.6, z), (0.8, 1.9, 1.1), metal, 0.13)
        box('Sconce arm', (x, 5.0, z), (0.24, 0.22, 1.65), metal, 0.08, yaw=side*0.16)
        cylinder('Sconce drip cup', (x, 5.5, z), 0.46, 0.22, metal, 16, 0.04)
        cylinder('Sconce candle', (x, 6.08, z), 0.13, 0.95, trim, 12, 0.025)
        sphere('Amber flame', (x, 6.62, z), (0.13, 0.24, 0.13), flame, 10, 6)
        for offset in (-0.28, 0.28):
            cylinder('Sconce scroll', (x+offset, 4.85, z), 0.09, 0.86, metal, 10, 0.018)

# Small shattered masonry and fallen carved fragments at the perimeter, never across exits.
for i in range(42):
    edge = random.choice(('left','right','near','far'))
    if edge == 'left':
        x=random.uniform(-20,-18.8); z=random.uniform(-18,18)
    elif edge == 'right':
        x=random.uniform(18.8,20); z=random.uniform(-18,18)
    elif edge == 'near':
        x=random.uniform(-18,18); z=random.uniform(18,20)
    else:
        x=random.uniform(-18,18); z=random.uniform(-20,-18)
    if edge in ('near','far') and abs(x) < 10:
        x = math.copysign(random.uniform(10.5, 18.0), x if x else random.choice((-1, 1)))
    sx=random.uniform(0.35,1.25); sy=random.uniform(0.22,0.8); sz=random.uniform(0.35,1.0)
    box('Broken limestone rubble', (x, sy*0.48, z), (sx, sy, sz), stone if i%3 else trim,
        bevel=min(sx,sy,sz)*0.15, yaw=random.uniform(-math.pi,math.pi))

# Mesh material batches: many detailed pieces collapse to one mesh per material.
for material_name, objects in BATCHES.items():
    objects=[obj for obj in objects if obj and obj.name in bpy.data.objects]
    if not objects:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    active=objects[0]
    bpy.context.view_layer.objects.active=active
    bpy.ops.object.join()
    active.name='Cathedral batch | ' + material_name
    active.data.name=active.name + ' mesh'
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR', center='MEDIAN')
    for polygon in active.data.polygons:
        polygon.use_smooth = False

# No physics, colliders, lights, or cameras are exported; the game's original runtime owns them.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=str(OUT), export_format='GLB', export_apply=True,
    export_texcoords=True, export_normals=True, export_materials='EXPORT',
    export_cameras=False, export_lights=False, export_animations=False,
    export_yup=True, export_image_format='AUTO', export_keep_originals=False
)
print(f'Wrote {OUT} ({OUT.stat().st_size:,} bytes); material batches={len(BATCHES)}')
