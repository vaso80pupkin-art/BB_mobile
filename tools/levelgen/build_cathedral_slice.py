"""Build a render-only Cathedral Quarter entrance-hall slice for Three.js r128."""
import bpy, math
from mathutils import Vector
from pathlib import Path

OUT = Path(__file__).resolve().parents[2] / 'assets' / 'levelgen' / 'cathedral_ground_slice.glb'
OUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
stone=bpy.data.materials.new('Cold blue-grey wet cathedral stone'); stone.diffuse_color=(0.16,0.19,0.24,1); stone.use_nodes=True
p=stone.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(0.16,0.19,0.24,1); p.inputs['Roughness'].default_value=.82
trim=bpy.data.materials.new('Worn pale limestone'); trim.diffuse_color=(.34,.36,.39,1); trim.use_nodes=True
p=trim.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(.34,.36,.39,1); p.inputs['Roughness'].default_value=.9
metal=bpy.data.materials.new('Aged brass'); metal.diffuse_color=(.35,.23,.10,1); metal.use_nodes=True
p=metal.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(.35,.23,.10,1); p.inputs['Metallic'].default_value=.55; p.inputs['Roughness'].default_value=.48

def cube(name, loc, scale, mat, bevel=0):
    # Inputs are Three.js (x, up, z); Blender uses Z-up before glTF conversion.
    bx, by, bz = loc[0], -loc[2], loc[1]
    sx, sy, sz = scale[0], scale[2], scale[1]
    bpy.ops.mesh.primitive_cube_add(size=1, location=(bx,by,bz)); o=bpy.context.object; o.name=name; o.dimensions=(sx,sy,sz); bpy.ops.object.transform_apply(location=False, rotation=False, scale=True); o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Worn edges','BEVEL'); m.width=bevel; m.segments=2
        o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o

def arch(name, x, z, y=7.4, width=7.2, spring=5.5, mat=trim):
    pts=[]; half=width/2
    pts.extend([(-half,0),(-half,spring)])
    for i in range(25):
        t=i/24; pts.append((-half+width*t, spring+(y-spring)*(1-abs(2*t-1)**1.35)))
    pts.append((half,0))
    cu=bpy.data.curves.new(name,'CURVE'); cu.dimensions='3D'; cu.bevel_depth=.18; cu.bevel_resolution=2
    s=cu.splines.new('POLY'); s.points.add(len(pts)-1)
    for q,(px,py) in zip(s.points,pts): q.co=(px,0,py,1)
    o=bpy.data.objects.new(name,cu); bpy.context.collection.objects.link(o); o.location=(x,-z,0); o.data.materials.append(mat); return o

# Local origin is the center of the 63x63 game-unit start room; all geometry is decorative.
for x in (-27,27):
    for z in (-27,27):
        cube('Buttress plinth',(x,.65,z),(3,1.3,3),stone,.12)
        bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=1.18, depth=10.2, location=(x,-z,6.4)); bpy.context.object.name='Gothic pier'; bpy.context.object.data.materials.append(stone)
        cube('Pier capital',(x,11.35,z),(2.6,.65,2.6),trim,.08)
# Ribbed vaulted ceiling arcs across the hall, deliberately above the playable space.
for z in (-24,-12,0,12,24):
    arch('Pointed vault rib',0,z,y=15,width=58,spring=10.6,mat=trim)
    cube('Vault tie beam',(0,10.45,z),(56,.28,.28),stone,.04)
# Three lancet window surrounds on the far wall.
for x in (-18,0,18):
    cube('Lancet sill',(x,4.0,-29),(7,.42,.7),trim,.08)
    cube('Lancet jamb L',(x-3.15,7.4,-29),(0.52,7.0,.65),trim,.08)
    cube('Lancet jamb R',(x+3.15,7.4,-29),(0.52,7.0,.65),trim,.08)
    arch('Pointed lancet surround',x,-29,y=11.0,width=6.3,spring=8.3,mat=trim)
    # Cool luminous glass plane remains non-colliding art.
    g=bpy.data.materials.new('Moonlit glass'); g.diffuse_color=(.22,.33,.48,.65); g.use_nodes=True
    bs=g.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=(.22,.33,.48,1); bs.inputs['Emission Color'].default_value=(.12,.22,.4,1); bs.inputs['Emission Strength'].default_value=.4; bs.inputs['Roughness'].default_value=.25
    cube('Moonlit lancet glass',(x,6.7,-29.18),(5.2,5.8,.08),g)
# Brass floor compass motif, flush and safely away from the spawn/lantern ring.
for a in range(8):
    ob=cube('Brass compass inlay',(0,.035,0),(.12,.05,8.5),metal,.02); ob.rotation_euler[1]=a*math.pi/4
# No lights, cameras, physics, or collision objects are exported; runtime handles those.
bpy.ops.object.select_all(action='SELECT'); bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',export_apply=True,export_texcoords=True,export_normals=True,export_materials='EXPORT',export_cameras=False,export_lights=False,export_animations=False,export_yup=True)
print('Wrote',OUT,OUT.stat().st_size)
