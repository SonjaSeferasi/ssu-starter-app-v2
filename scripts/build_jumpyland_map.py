"""Build real, editable Jumpyland scenery in Blender 4.5+ and export web GLB.

blender --background --factory-startup --python scripts/build_jumpyland_map.py
All land, structures and plants are modeled geometry. No world-map panorama is
projected onto the scene. Existing CC0 PBR maps provide the rock/grass surfaces.
"""
import bpy
import math
import random
import json
from pathlib import Path
from mathutils import Vector
from mathutils.noise import noise_vector, fractal

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public/jumpyland/models'
SOURCE = ROOT / 'assets/models/jumpyland'
PREVIEW = ROOT / 'output/jumpyland'
for directory in (OUT, SOURCE, PREVIEW):
    directory.mkdir(parents=True, exist_ok=True)
random.seed(351)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

def material(name, color, roughness=.85, metal=0, emission=0):
    mat=bpy.data.materials.new(name); mat.use_nodes=True
    bsdf=mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value=(*color,1)
    bsdf.inputs['Roughness'].default_value=roughness
    bsdf.inputs['Metallic'].default_value=metal
    if emission:
        bsdf.inputs['Emission Color'].default_value=(*color,1)
        bsdf.inputs['Emission Strength'].default_value=emission
    return mat

def pbr(name, prefix, tint=(1,1,1)):
    mat=material(name,tint)
    nodes=mat.node_tree.nodes; links=mat.node_tree.links
    bsdf=nodes.get('Principled BSDF')
    for suffix,socket in [('Diffuse','Base Color'),('Rough','Roughness'),('nor_gl','Normal')]:
        image=nodes.new('ShaderNodeTexImage')
        image.image=bpy.data.images.load(str(ROOT/f'public/jumpyland/pbr/{prefix}-{suffix}.jpg'),check_existing=True)
        image.extension='REPEAT'
        if suffix!='Diffuse': image.image.colorspace_settings.name='Non-Color'
        if suffix=='nor_gl':
            normal=nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.55
            links.new(image.outputs['Color'],normal.inputs['Color']);links.new(normal.outputs['Normal'],bsdf.inputs['Normal'])
        elif suffix=='Diffuse' and name.startswith('Meadow'):
            pigment=nodes.new('ShaderNodeMixRGB');pigment.blend_type='MULTIPLY';pigment.inputs[0].default_value=1
            pigment.inputs[2].default_value=(.40,1.02,.24,1)
            links.new(image.outputs['Color'],pigment.inputs[1]);links.new(pigment.outputs[0],bsdf.inputs[socket])
        else: links.new(image.outputs['Color'],bsdf.inputs[socket])
    return mat

rock=pbr('Weathered mossy limestone','mossy_rock')
sandstone=pbr('Layered golden sandstone','mossy_sandstone')
grass=pbr('Meadow grass and exposed stone','aerial_grass_rock')
stone=material('Warm carved limestone',(.57,.51,.39))
ivory=material('Castle ivory stone',(.73,.70,.58))
roof=material('Weathered terracotta roofs',(.43,.105,.065),.83)
wood=material('Aged cedar',(.27,.15,.065))
bark=pbr('Japanese cedar bark','japanese_cedar_bark')
plank=material('Sunlit cedar planks',(.47,.31,.15))
dark=material('Deep window recesses',(.035,.049,.038))
red=material('Mushroom vermilion',(.65,.105,.045),.4)
cream=material('Mushroom ivory',(.84,.79,.58))
pipegreen=material('Enamel emerald pipes',(.06,.30,.075),.23,.32)
gold=material('Gold coins',(.94,.60,.055),.22,.74)
orange=material('Four star Dragon Ball',(.95,.37,.018),.17,.16)
yellow=material('Wildflower centers',(.92,.61,.045),.67)
white=material('Wildflower petals',(.91,.88,.69),.8)
bamboo=material('Living bamboo',(.23,.31,.10))
torii=material('Village gate lacquer',(.43,.11,.045),.5)
slate=material('Blue slate roof tiles',(.10,.16,.16))
trailmat=material('Warm footpath gravel',(.34,.25,.12))
flowmat=material('Falling water',(.65,.86,.86),.22,.12)
flowmat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.69
flowmat.surface_render_method='DITHERED'
# Exportable procedural foam texture, authored inside Blender. Broken strands
# let the underlying rock show through instead of making a white rectangle.
foam=bpy.data.images.new('Waterfall foam strands',width=96,height=384,alpha=True)
pixels=[]
for j in range(384):
    v=j/383
    for i in range(96):
        u=i/95;strand=.5+.5*math.sin(u*87+math.sin(v*19)*1.2)
        strands=strand**4;edge=max(0,math.sin(u*math.pi))**.5
        alpha=edge*(.13+.57*strands+.13*math.sin(v*141+u*9)**2)
        pixels.extend((.73+strands*.25,.86+strands*.13,.88+strands*.11,alpha))
foam.pixels.foreach_set(pixels);foam.pack()
foam_node=flowmat.node_tree.nodes.new('ShaderNodeTexImage');foam_node.image=foam
flowmat.node_tree.links.new(foam_node.outputs['Color'],flowmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
flowmat.node_tree.links.new(foam_node.outputs['Alpha'],flowmat.node_tree.nodes['Principled BSDF'].inputs['Alpha'])
watermat=material('Valley water',(.075,.31,.36),.2,.25)
mountainmat=material('Distant blue mountains',(.30,.40,.45),1)
snowmat=material('High alpine snow',(.80,.86,.86),.95)
planetmat=material('Distant turquoise moon',(.30,.53,.56),1)
moon_image=bpy.data.images.new('Moon surface',width=256,height=128);moon_pixels=[]
for j in range(128):
    v=j/127*math.pi
    for i in range(256):
        u=i/255*math.tau;point=Vector((math.sin(v)*math.cos(u),math.sin(v)*math.sin(u),math.cos(v)))
        n=fractal(point*6,.8,2,4);albedo=.90+n*.10
        moon_pixels.extend((albedo*.65,albedo*.85,albedo*.90,1))
moon_image.pixels.foreach_set(moon_pixels);moon_image.pack()
moon_node=planetmat.node_tree.nodes.new('ShaderNodeTexImage');moon_node.image=moon_image
planetmat.node_tree.links.new(moon_node.outputs['Color'],planetmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
pine_mats=[material('Forest needles '+str(i),c) for i,c in enumerate([(.09,.17,.055),(.13,.23,.065),(.19,.27,.075),(.22,.30,.10)])]
blue_mats=[material('Sky island foliage '+str(i),c) for i,c in enumerate([(.035,.25,.28),(.055,.32,.34),(.10,.39,.42)])]

# Alpha-tested branch cards carry individual leaf veins, inside a genuinely
# branched three dimensional crown. The crown is never a single billboard.
leaf=material('Sunlit broadleaf canopy',(.72,.85,.49))
image=leaf.node_tree.nodes.new('ShaderNodeTexImage');image.image=bpy.data.images.load(str(ROOT/'public/jumpyland/scenery-v2/foliage.webp'))
leaf.node_tree.links.new(image.outputs['Color'],leaf.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
leaf.node_tree.links.new(image.outputs['Alpha'],leaf.node_tree.nodes['Principled BSDF'].inputs['Alpha'])
leaf.surface_render_method='DITHERED';leaf.use_backface_culling=False

# Batch primitives by material: the model contains detailed geometry without
# requiring one draw call per leaf, grass blade, plank or stone.
batches={}
def add(mat, verts, faces, uv=None):
    entry=batches.setdefault(mat.name,{'mat':mat,'verts':[],'faces':[],'uv':[]})
    base=len(entry['verts']);entry['verts'].extend(verts)
    entry['faces'].extend(tuple(base+i for i in face) for face in faces)
    entry['uv'].extend(uv or [(v[0]*.18,v[1]*.18+v[2]*.18) for v in verts])

def cube(mat, center, size, angle=0):
    x,y,z=center;w,d,h=(s/2 for s in size);c=math.cos(angle);s=math.sin(angle)
    verts=[(x+xx*c-yy*s,y+xx*s+yy*c,z+zz) for xx,yy,zz in [(-w,-d,-h),(w,-d,-h),(w,d,-h),(-w,d,-h),(-w,-d,h),(w,-d,h),(w,d,h),(-w,d,h)]]
    add(mat,verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])

def tube(mat, a, b, radius, top=None, sides=10):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
    if u.length<.01:u=axis.cross(Vector((0,1,0)))
    u.normalize();v=axis.cross(u).normalized();top=radius if top is None else top
    verts=[];uv=[]
    for p,r in [(a,radius),(b,top)]:
        for i in range(sides):
            ang=i/sides*math.tau;q=p+r*(u*math.cos(ang)+v*math.sin(ang));verts.append(tuple(q));uv.append((i/sides,(p-a).length*.23))
    faces=[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]
    faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
    add(mat,verts,faces,uv)

def sphere(mat,center,scale,rings=7,sides=12):
    x,y,z=center;sx,sy,sz=scale;verts=[];uv=[]
    for j in range(rings+1):
        phi=j/rings*math.pi
        for i in range(sides):
            a=i/sides*math.tau;verts.append((x+sx*math.sin(phi)*math.cos(a),y+sy*math.sin(phi)*math.sin(a),z+sz*math.cos(phi)));uv.append((i/sides,j/rings))
    faces=[(j*sides+i,(j+1)*sides+i,(j+1)*sides+(i+1)%sides,j*sides+(i+1)%sides) for j in range(rings) for i in range(sides)]
    add(mat,verts,faces,uv)

land_forms=[]
def terrain(name,cx,cy,rx,ry,height,seed):
    rng=random.Random(seed);n=144;rings=33;verts=[];uv=[]
    cliffmat=sandstone if 'Skybound' in name or 'karst' in name or 'Carved' in name else rock
    outline=[1+.11*math.sin(i/n*math.tau*3+seed)+.065*math.sin(i/n*math.tau*7+seed*.2)+.032*math.sin(i/n*math.tau*13+seed) for i in range(n)]
    land_forms.append((cx,cy,rx,ry,height,outline))
    for j in range(rings):
        t=j/(rings-1);z=-3+t*(height+3)
        ledge=.035*math.sin(t*math.pi*8+seed)+.025*math.sin(t*math.pi*20)
        for i in range(n):
            a=i/n*math.tau;r=outline[i]*(.90+.10*t+ledge)
            # Multi-scale erosion breaks the silhouette and the shading, rather
            # than sticking round boulders onto an otherwise smooth cylinder.
            point=Vector((math.cos(a)*rx*.65+seed,math.sin(a)*ry*.65,z*.72))
            erosion=fractal(point,.8,2,3)*.75*math.sin(t*math.pi)
            fissure=abs(math.sin(a*17+seed+math.sin(a*7)*1.3))**12*.38
            rr=r+(erosion-fissure)/max(2,min(rx,ry))
            verts.append((cx+math.cos(a)*rx*rr,cy+math.sin(a)*ry*rr,z+(.16*math.sin(a*8+seed) if j not in (0,rings-1) else 0)));uv.append((i/n*rx*1.1,z*.23))
    faces=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(rings-1) for i in range(n)]
    add(cliffmat,verts,faces,uv)
    verts=[(cx,cy,height+.025)];uv=[(cx*.25,cy*.25)]
    for j in range(1,15):
        t=j/14
        for i in range(n):
            a=i/n*math.tau;r=outline[i]*t;x=cx+math.cos(a)*rx*r;y=cy+math.sin(a)*ry*r
            zz=height+.025+(.16*math.sin(x*.8)*math.cos(y*.7)*(1-t*t))
            verts.append((x,y,zz));uv.append((x*.25,y*.25))
    faces=[(0,1+i,1+(i+1)%n) for i in range(n)]
    for j in range(13):
        a=1+j*n;b=a+n
        faces.extend((a+i,b+i,b+(i+1)%n,a+(i+1)%n) for i in range(n))
    add(grass,verts,faces,uv)
    # Fractured ledges and angular slabs form strata under the cap.
    for i in range(55):
        index=int(i/55*n);a=index/n*math.tau;r=outline[index]*.98
        x=cx+math.cos(a)*rx*r;y=cy+math.sin(a)*ry*r
        size=rng.uniform(.35,.85);zz=height-rng.uniform(.2,2.8)
        crag(cliffmat,(x,y,zz),(size*1.3,size,size*.7),seed+i)
    return (cx,cy,rx,ry,height)

def crag(mat,center,scale,seed):
    rng=random.Random(seed);x,y,z=center;sx,sy,sz=scale;n=9;verts=[]
    for row in range(4):
        t=row/3;rr=math.sin(.18+t*2.8)
        for i in range(n):
            a=i/n*math.tau;variation=.76+rng.random()*.40
            verts.append((x+math.cos(a)*sx*rr*variation,y+math.sin(a)*sy*rr*variation,z+sz*(t*2-1)))
    add(mat,verts,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(3) for i in range(n)])

def pine(x,y,z,h=5,blue=False):
    mats=blue_mats if blue else pine_mats
    tube(bark,(x,y,z),(x+.12,y,z+h*.91),h*.045,h*.009,14)
    if blue:
        # Broad, umbrella-shaped Namek trees with modeled branch forks.
        for i in range(7):
            a=i*2.4;end=(x+math.cos(a)*h*.25,y+math.sin(a)*h*.25,z+h*(.76+random.random()*.12))
            tube(wood,(x,y,z+h*.57),end,h*.012,h*.006,6)
            for k in range(15):
                aa=k*2.4;rr=h*.19*math.sqrt(random.random())
                crag(mats[k%len(mats)],(end[0]+math.cos(aa)*rr,end[1]+math.sin(aa)*rr,end[2]+random.uniform(-.03,.06)*h),(h*.083,h*.08,h*.044),k+i*17)
        return
    # Some trees have broad, irregular crowns; others retain the reference's
    # conifer silhouette. Both have shaded branches and several leaf layers.
    if random.random()<.58:
        for i in range(10):
            a=i*2.4;end=Vector((x+math.cos(a)*h*.20,y+math.sin(a)*h*.20,z+h*(.63+random.random()*.32)))
            tube(bark,(x,y,z+h*.5),end,h*.017,h*.004,8)
            for k in range(9):
                center=end+Vector((random.uniform(-.13,.13)*h,random.uniform(-.13,.13)*h,random.uniform(-.08,.08)*h))
                aa=random.random()*math.tau;u=Vector((math.cos(aa),math.sin(aa),random.uniform(-.5,.5)))*h*.13
                v=Vector((-math.sin(aa)*.5,math.cos(aa)*.5,.8))*h*.14
                add(leaf,[tuple(center-u-v),tuple(center+u-v),tuple(center+u+v),tuple(center-u+v)],[(0,1,2,3)],[(0,0),(1,0),(1,1),(0,1)])
        return
    for tier in range(11):
        t=tier/11;zz=z+h*(.22+t*.72);rad=h*(.26*(1-t)+.015)
        for j in range(9):
            a=j/9*math.tau+tier*.73;tip=Vector((x+math.cos(a)*rad,y+math.sin(a)*rad,zz-.10*h*(1-t)))
            tube(wood,(x,y,zz),tip,h*.008,h*.002,5)
            for k in range(8):
                p=Vector((x,y,zz)).lerp(tip,.12+k*.11)
                for side in [-1,1]:
                    b=a+side*.78;length=h*(.10+.025*random.random())*(1-t*.6)
                    tip2=p+Vector((math.cos(b)*length,math.sin(b)*length,length*.20));cross=Vector((-math.sin(b),math.cos(b),0))*length*.48
                    add(mats[(tier+j+k)%len(mats)],[tuple(p),tuple(p+(tip2-p)*.5+cross),tuple(tip2),tuple(p+(tip2-p)*.5-cross)],[(0,1,2,3)])

def mushroom(x,y,z,size=1):
    tube(cream,(x,y,z),(x,y,z+size*1.7),size*.23,size*.17,20)
    sides=48;profile=[(0,2.45),(.25,2.43),(.53,2.34),(.82,2.14),(1.02,1.88),(1.04,1.73),(.86,1.66),(0,1.66)]
    verts=[(x+math.cos(i/sides*math.tau)*r*size,y+math.sin(i/sides*math.tau)*r*size,z+zz*size) for r,zz in profile for i in range(sides)]
    faces=[(j*sides+i,(j+1)*sides+i,(j+1)*sides+(i+1)%sides,j*sides+(i+1)%sides) for j in range(len(profile)-1) for i in range(sides)]
    add(red,verts,faces)
    for i in range(18):
        a=random.random()*math.tau;r=random.uniform(.18,.91);zz=2.45-.6*r*r
        sphere(cream,(x+math.cos(a)*r*size,y+math.sin(a)*r*size,z+zz*size),(size*.11,size*.11,size*.024),4,9)
    for i in range(32):
        a=i/32*math.tau;tube(cream,(x+math.cos(a)*.2*size,y+math.sin(a)*.2*size,z+1.66*size),(x+math.cos(a)*.9*size,y+math.sin(a)*.9*size,z+1.68*size),.012*size,sides=4)

def pipe(x,y,z,h=2.5,r=.75):
    n=48;verts=[]
    for zz,rr in [(0,r),(h-.32,r),(h-.32,r*1.14),(h,r*1.14),(h,r*.83),(h-.5,r*.83)]:
        verts.extend((x+math.cos(i/n*math.tau)*rr,y+math.sin(i/n*math.tau)*rr,z+zz) for i in range(n))
    add(pipegreen,verts,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(5) for i in range(n)])
    tube(dark,(x,y,z+h-.55),(x,y,z+h-.54),r*.82,sides=48)

def fence(points,z,redwood=False):
    mat=torii if redwood else wood
    for x,y in points:tube(mat,(x,y,z),(x,y,z+1.1),.065,.055,7)
    for a,b in zip(points,points[1:]):
        for hh in [.38,.90]:tube(mat,(*a,z+hh),(*b,z+hh),.045,sides=6)

def house(x,y,z,size=1):
    w=2.0*size;d=1.7*size;h=1.8*size
    cube(ivory,(x,y,z+h/2),(w,d,h))
    # Tiled hip roof with raised ridge and real projecting eaves.
    verts=[(x-w*.66,y-d*.66,z+h),(x+w*.66,y-d*.66,z+h),(x+w*.66,y+d*.66,z+h),(x-w*.66,y+d*.66,z+h),(x-w*.25,y,z+h+.8*size),(x+w*.25,y,z+h+.8*size)]
    add(roof,verts,[(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)])
    for side in [-1,1]:
        for i in range(13):
            xx=x-w*.48+i/12*w*.96
            tube(roof,(xx,y,z+h+.8*size),(xx,y+side*d*.66,z+h+.02),.034*size,sides=6)
        for j in range(4):
            t=(j+1)/5;tube(wood,(x-w*(.25+.41*t),y+side*d*.66*t,z+h+.8*size*(1-t)+.015),(x+w*(.25+.41*t),y+side*d*.66*t,z+h+.8*size*(1-t)+.015),.012*size,sides=4)
    tube(roof,(x-w*.28,y,z+h+.82*size),(x+w*.28,y,z+h+.82*size),.07*size,sides=8)
    for xx in [-.53,.53]:cube(dark,(x+xx*size,y-d/2-.012,z+h*.64),(.34*size,.025,.43*size))
    cube(wood,(x,y-d/2-.02,z+.5*size),(.40*size,.04,1.0*size))
    for xx in [-w/2,w/2]:cube(wood,(x+xx,y-d/2-.035,z+h/2),(.07*size,.07*size,h))

def castle(x,y,z):
    cube(ivory,(x,y,z+2.1),(7,4.8,4.2))
    cube(dark,(x,y-2.411,z+1.2),(1.45,.045,2.4))
    # Arch voussoirs, a recessed entrance, brick courses and crenellations.
    for j in range(13):
        a=j/12*math.pi;cube(stone,(x+math.cos(a)*.86,y-2.45,z+2+math.sin(a)*.86),(.24,.25,.24),a)
    for xx in [-3.2,3.2]:
        for yy in [-2.0,2.0]:
            tube(ivory,(x+xx,y+yy,z),(x+xx,y+yy,z+6),.79,.72,28)
            tube(roof,(x+xx,y+yy,z+6),(x+xx,y+yy,z+8.5),1.02,.025,32)
            for hh in [1.0,2.3,3.6,4.9]:
                tube(stone,(x+xx,y+yy,z+hh),(x+xx,y+yy,z+hh+.065),.795,.79,28)
            cube(dark,(x+xx,y+yy-.76,z+4.3),(.23,.03,.69))
            tube(wood,(x+xx,y+yy,z+8.5),(x+xx,y+yy,z+9.3),.022,sides=6)
            add(torii,[(x+xx,y+yy,z+9.3),(x+xx+.63,y+yy,z+9.06),(x+xx,y+yy,z+8.88)],[(0,1,2)])
    for i in range(12):cube(ivory,(x-3.3+i*.6,y-2.3,z+4.45),(.3,.45,.55))
    for j in range(9):
        for i in range(14):
            xx=x-3.25+i*.5+(j%2)*.25
            if abs(xx-x)>.9 or j>5:cube(stone,(xx,y-2.409,z+.24+j*.44),(.47,.018,.025))

def gate(x,y,z):
    for xx in [-2.1,2.1]:
        tube(torii,(x+xx,y,z),(x+xx,y,z+4.9),.21,.17,16)
        cube(wood,(x+xx,y,z+.12),(.63,.65,.24))
    cube(torii,(x,y,z+3.85),(5.0,.34,.29))
    # Curved, tiled Japanese gateway roof, with a solid ridge.
    n=22;verts=[]
    for yy in [-.86,.86]:
        for i in range(n):
            xx=-3+i/(n-1)*6;zz=z+4.75+.07*xx*xx
            verts.append((x+xx,y+yy,zz))
    add(slate,verts,[(i,i+1,n+i+1,n+i) for i in range(n-1)])
    for i in range(n):
        xx=-3+i/(n-1)*6;zz=z+4.75+.07*xx*xx;tube(slate,(x+xx,y-.9,zz),(x+xx,y+.9,zz),.055,sides=6)
    cube(cream,(x,y-.03,z+3.25),(1.7,.04,1.3))
    # A carved spiral emblem on the cloth; no text baked into the model.
    points=[]
    for i in range(45):
        t=i/44*math.tau*1.65;r=.045+.026*t;points.append((x+math.cos(t)*r,y-.065,z+3.25+math.sin(t)*r))
    for a,b in zip(points,points[1:]):tube(torii,a,b,.035,sides=5)
    for xx in [-2.7,2.7]:
        tube(wood,(x+xx,y,z),(x+xx,y,z+2.6),.06,sides=8)
        sphere(cream,(x+xx,y,z+2.05),(.33,.3,.52),9,16)
        for hh in [1.63,2.47]:tube(wood,(x+xx,y,z+hh),(x+xx,y,z+hh+.055),.31,sides=16)

def stone_face(x,y,z,style):
    # Human reliefs are solid sculpted forms inset into the cliff wall.
    # Their sandstone matches the parent cliff; these are carved reliefs.
    stone=sandstone
    sphere(stone,(x,y,z),(1.1,.7,1.6),12,20)
    sphere(stone,(x,y-.50,z-.50),(.66,.45,.82),9,16)
    for xx in [-.43,.43]:
        sphere(dark,(x+xx,y-.64,z+.17),(.26,.025,.09),5,10)
        tube(stone,(x+xx-.27,y-.69,z+.40),(x+xx+.24,y-.68,z+.35),.13,sides=10)
    add(stone,[(x-.16,y-.64,z+.4),(x+.16,y-.64,z+.4),(x+.19,y-.71,z-.25),(x,y-1.04,z-.12),(x-.19,y-.71,z-.25)],[(0,1,3),(1,2,3),(2,4,3),(4,0,3)])
    tube(dark,(x-.35,y-.77,z-.67),(x+.35,y-.77,z-.67),.033,sides=8)
    sphere(stone,(x,y-.72,z-.58),(.40,.12,.10),5,13)
    if style%2:
        for i in range(9):
            a=i/9*math.pi;tube(stone,(x+math.cos(a)*.8,y,z+1.15+math.sin(a)*.2),(x+math.cos(a)*1.45,y-.1,z+1.5+math.sin(a)*.7),.34,.025,7)
    else:
        sphere(stone,(x,y+.02,z+1.02),(1.18,.8,.68),8,17)
        for xx in [-1,1]:tube(stone,(x+xx,y,z+.80),(x+xx*1.08,y-.20,z-1),.29,.15,10)

west=terrain('West meadow',-22,-8,13.5,17,10,11)
east=terrain('Village forest',22,-6,13.5,18,10.8,22)
castlehill=terrain('Castle hill',-25,13,9,8.5,13,33)
core=terrain('Skybound terrace',0,18,8.5,8,12.5,44)
terrain('Skybound upper terrace',1,25,5.5,6,17,54)
terrain('Skybound crown',-2,32,3.0,4,25,64)
terrain('Carved mountain',25,24,11,6.5,21,74)
for i in range(27):
    x=random.uniform(-55,42);y=random.uniform(34,82)
    if abs(x)<5 and y<39:continue
    h=random.uniform(7,24);terrain('Distant karst',x,y,random.uniform(2.0,4.4),random.uniform(2.5,5),h,100+i)
    pine(x,y,h,random.uniform(2.6,4),True)
for x,y,r,h in [(-11,15,2.6,6),(-9,25,2.3,9),(10,19,2.0,6),(11,32,3,12),(0,6,2.3,3.5),(-4,4,1.7,2)]:terrain('River stone island',x,y,r,r*.8,h,int(x*51+y*37))

# A stone bridge crosses the central gorge. Individual balusters and planks
# remain genuine modeled details when viewed from a different camera angle.
for i in range(81):
    t=i/80;x=-10+20*t;zz=6.4+math.sin(t*math.pi)*1.8
    cube(stone,(x,-11,zz),(20/81+.015,2.3,.28))
    if i%4==0:
        for yy in [-12.05,-9.95]:tube(torii,(x,yy,zz),(x,yy,zz+1),.065,sides=7)
    if i:
        prev=(-10+20*(i-1)/80,6.4+math.sin((i-1)/80*math.pi)*1.8)
        for yy in [-12.05,-9.95]:tube(torii,(prev[0],yy,prev[1]+.92),(x,yy,zz+.92),.05,sides=7)
# Masonry spandrels frame an open arch, instead of two thin support poles.
for side in [-1,1]:
    yy=-11+side*1.1;verts=[]
    for i in range(65):
        t=i/64;x=-10+20*t
        verts.extend([(x,yy,6.4+math.sin(t*math.pi)*1.8-.12),(x,yy,1.8+math.sin(t*math.pi)*5.4)])
    add(sandstone,verts,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(64)])

castle(-25,14,13)
for x,y,size in [(-30,-18,1.65),(-15,-8,1.12),(-30,0,.7),(-17,-20,.85),(-13,-2,.65),(-27,-8,.5)]:mushroom(x,y,10,size)
pipe(-28,-10,10,3.6,1.2);pipe(-19,-2,10,2.7,.85)
for i in range(4):
    cube(roof,(-25+i*.51,-4,11.5),(.49,.55,.48))
    cube(ivory,(-25+i*.51,-4.29,11.5),(.018,.03,.44))
for i in range(5):tube(gold,(-23+i*.7,-5,11.4+i*.14),(-23+i*.7,-4.88,11.4+i*.14),.24,sides=32)

# Sandy footpaths, low fences and grass tufts establish scale in the gardens.
def path(points,z,width):
    for a,b in zip(points,points[1:]):
        length=math.hypot(b[0]-a[0],b[1]-a[1]);dx=-(b[1]-a[1])/length*width/2;dy=(b[0]-a[0])/length*width/2
        add(trailmat,[(a[0]-dx,a[1]-dy,z+.065),(b[0]-dx,b[1]-dy,z+.065),(b[0]+dx,b[1]+dy,z+.065),(a[0]+dx,a[1]+dy,z+.065)],[(0,1,2,3)])
path([(-23,-23),(-18,-13),(-17,-4),(-22,5),(-25,11)],10,1.55)
path([(24,-22),(18,-13),(18,-3),(23,5),(24,10)],10.8,1.5)
fence([(-25,-24),(-23,-20),(-21,-16),(-20,-12)],10)
fence([(-15,-17),(-14,-12),(-14,-7)],10)
fence([(26,-23),(23,-19),(21,-15),(20,-11)],10.8,True)

gate(22,-4,10.8)
for x,y,s in [(18,6,1.2),(24,8,1.3),(28,6,1.1),(21,12,1),(29,13,.9),(17,12,.9),(26,16,1.15),(22,18,.9)]:house(x,y,10.8,s)
for i in range(4):stone_face(17.5+i*4.6,15.6,18.4,i)
for x,y,h in [(-3,19,3.3),(3,16,3.4),(-5,21,3),(4,22,3),(-2,33,3.4),(2,26,3.8)]:pine(x,y,12.5 if y<24 else 17 if y<30 else 25,h,True)
sphere(orange,(2,23,20.2),(.75,.75,.75),18,28)

# Tree placements follow the authored plateau ellipses; clear paths remain open.
for plateau in [west,east,castlehill]:
    cx,cy,rx,ry,z=plateau
    for i in range(30 if plateau==west else 68 if plateau==east else 24):
        a=random.random()*math.tau;r=math.sqrt(random.uniform(.23,.85));x=cx+math.cos(a)*rx*r;y=cy+math.sin(a)*ry*r
        if plateau==west and abs(x+20)<3.5:continue
        if plateau==east and ((abs(x-22)<4.4 and y<1) or y>4):continue
        if plateau==castlehill and abs(x+25)<6.5 and y<19:continue
        if plateau==west and ((x<-25 and -17<y<-5) or (-18<x<-11 and -12<y<0)):continue
        if plateau==east and 16<x<29 and -9<y<6:continue
        pine(x,y,z,random.uniform(2.8,4.5) if plateau==west else random.uniform(3.2,7.0))
    for i in range(3600):
        a=random.random()*math.tau;r=math.sqrt(random.random())*.94;x=cx+math.cos(a)*rx*r;y=cy+math.sin(a)*ry*r
        if (plateau==west and abs(x+20)<1.3) or (plateau==east and abs(x-22)<2):continue
        zz=z+.05
        for j in range(3):
            angle=random.random()*math.tau;h=random.uniform(.19,.52);w=.032
            add(pine_mats[j%4],[(x-w,y,zz),(x+w,y,zz),(x+math.cos(angle)*h*.4,y+math.sin(angle)*h*.4,zz+h)],[(0,1,2)])
        if i%7==0:
            sphere(yellow,(x,y,zz+.22),(.055,.055,.04),3,5)
            for k in range(5):
                ang=k/5*math.tau;sphere(white,(x+math.cos(ang)*.08,y+math.sin(ang)*.08,zz+.22),(.065,.035,.018),3,5)
    for i in range(32):
        a=random.random()*math.tau;x=cx+math.cos(a)*rx*.9;y=cy+math.sin(a)*ry*.9;s=random.uniform(.22,.6)
        crag(rock,(x,y,z+s*.25),(s,s*.8,s*.58),i+331)

# Continuous modeled waterfalls with layered ribbons and scattered spray.
for form_index,w in [(2,1.7),(0,1.1),(3,1.7),(4,1),(5,.75),(1,1.2)]:
    cx,cy,rx,ry,z,outline=land_forms[form_index];index=len(outline)*3//4;a=index/len(outline)*math.tau
    x=cx+math.cos(a)*rx*outline[index];y=cy+math.sin(a)*ry*outline[index]-.13
    verts=[];n=36
    for j in range(n):
        t=j/(n-1);zz=z-(z+.8)*t;curve=.3*math.sin(t*math.pi)
        spread=w*(1+t*.5);jitter=.05*math.sin(j*2.1)
        verts.extend([(x-spread/2+curve+jitter,y-.6*math.sin(t*math.pi/2),zz),(x+spread/2+curve-jitter,y-.6*math.sin(t*math.pi/2),zz)])
    add(flowmat,verts,[(j*2,j*2+1,j*2+3,j*2+2) for j in range(n-1)],[(u,j/(n-1)*3) for j in range(n) for u in (0,1)])
    for i in range(20):sphere(flowmat,(x+random.uniform(-w,w),y+random.uniform(-.5,.5),.4+random.random()*.8),(random.uniform(.07,.18),.08,.12),4,7)

# Terrain extends beneath sea level; islands are grounded, never floating slabs.
cube(watermat,(0,30,-.25),(250,260,.2))
for ridge in range(3):
    verts=[];nx=180;ny=21;distance=115+ridge*40
    for j in range(ny):
        t=j/(ny-1);yy=distance-14+t*30
        for i in range(nx):
            x=-140+i/(nx-1)*280
            peak=8+9*abs(math.sin(x*.041+ridge))+9*abs(math.sin(x*.093+ridge*2))
            z=-2+peak*math.sin(t*math.pi)**1.1+fractal(Vector((x*.12,yy*.12,ridge)),.9,2,4)*3*math.sin(t*math.pi)
            verts.append((x,yy,z))
    faces=[(j*nx+i,j*nx+i+1,(j+1)*nx+i+1,(j+1)*nx+i) for j in range(ny-1) for i in range(nx-1)]
    add(mountainmat,verts,faces)
    for face in faces:
        if min(verts[index][2] for index in face)>23:add(snowmat,[verts[index] for index in face],[(0,1,2,3)])
sphere(planetmat,(42,148,49),(16,16,16),48,72)

# Soft clouds sit at several actual depths above and between the mountain
# ridges, with alpha edges rather than solid white spheres.
cloudmat=material('High valley clouds',(.95,.98,1),1)
cloudmat.surface_render_method='DITHERED';cloudmat.use_backface_culling=False
cloud_image=bpy.data.images.new('Cloud vapor',width=256,height=96,alpha=True)
cloud_pixels=[];puffs=[(.20,.43,.14),(.36,.57,.20),(.53,.64,.22),(.69,.49,.17),(.83,.42,.13)]
for j in range(96):
    for i in range(256):
        u=i/255;v=j/95;density=0
        for px,py,rad in puffs:density+=math.exp(-(((u-px)/rad)**2+((v-py)/(rad*1.9))**2)*3)
        turbulence=.88+.12*math.sin(u*64+math.sin(v*33)*2)
        alpha=min(.87,max(0,(density-.10)*.75))*turbulence
        cloud_pixels.extend((.92,.96,1,alpha))
cloud_image.pixels.foreach_set(cloud_pixels);cloud_image.pack()
cloudnode=cloudmat.node_tree.nodes.new('ShaderNodeTexImage');cloudnode.image=cloud_image
cloudmat.node_tree.links.new(cloudnode.outputs['Color'],cloudmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
cloudmat.node_tree.links.new(cloudnode.outputs['Alpha'],cloudmat.node_tree.nodes['Principled BSDF'].inputs['Alpha'])
for i in range(18):
    rng=random.Random(51+i);x=rng.uniform(-100,100);y=rng.uniform(75,155);z=rng.uniform(20,47);w=rng.uniform(18,34);h=w*.34
    add(cloudmat,[(x-w/2,y,z-h/2),(x+w/2,y,z-h/2),(x+w/2,y,z+h/2),(x-w/2,y,z+h/2)],[(0,1,2,3)],[(0,0),(1,0),(1,1),(0,1)])

for name,entry in batches.items():
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(entry['verts'],[],entry['faces']);mesh.materials.append(entry['mat']);mesh.update()
    uv=mesh.uv_layers.new(name='UVMap')
    for polygon in mesh.polygons:
        polygon.use_smooth=True
        for loop in polygon.loop_indices:uv.data[loop].uv=entry['uv'][mesh.loops[loop].vertex_index]
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
    # Flat architecture avoids rounded cube normals. Organic terrain is smooth.
    if name not in {rock.name,sandstone.name,bark.name,grass.name,red.name,cream.name,pipegreen.name,orange.name,watermat.name,planetmat.name,mountainmat.name,snowmat.name,*[m.name for m in blue_mats]}:
        for polygon in mesh.polygons:polygon.use_smooth=False

anchors=[(-17,-9,11.2),(0,15,14),(19,-7,12)]
for i,position in enumerate(anchors):
    obj=bpy.data.objects.new('WorldAnchor'+str(i+1),None);obj.location=position;bpy.context.collection.objects.link(obj)

# Camera and lights are retained in the editable .blend; the web uses the same
# composition and recreates the lighting with Three.js shadow maps and sky light.
camera_data=bpy.data.cameras.new('MapCamera');camera=bpy.data.objects.new('MapCamera',camera_data);bpy.context.collection.objects.link(camera)
camera.location=(0,-63,31);target=Vector((0,13,11));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.lens=30;bpy.context.scene.camera=camera
world=bpy.data.worlds.new('Clear mountain daylight');world.use_nodes=True
sky=world.node_tree.nodes.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=.50;sky.sun_rotation=2.2;sky.sun_disc=False
world.node_tree.links.new(sky.outputs['Color'],world.node_tree.nodes['Background'].inputs['Color'])
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.18;bpy.context.scene.world=world
# A clear blue camera background, independently lit from the physical sky.
camera_sky=world.node_tree.nodes.new('ShaderNodeBackground');camera_sky.inputs['Color'].default_value=(.29,.58,.84,1);camera_sky.inputs['Strength'].default_value=.8
lightpath=world.node_tree.nodes.new('ShaderNodeLightPath');mix=world.node_tree.nodes.new('ShaderNodeMixShader')
world.node_tree.links.new(lightpath.outputs['Is Camera Ray'],mix.inputs[0]);world.node_tree.links.new(world.node_tree.nodes['Background'].outputs[0],mix.inputs[1]);world.node_tree.links.new(camera_sky.outputs[0],mix.inputs[2]);world.node_tree.links.new(mix.outputs[0],world.node_tree.nodes['World Output'].inputs['Surface'])
sun_data=bpy.data.lights.new('Late morning sun','SUN');sun_data.energy=3.8;sun_data.angle=.08
sun=bpy.data.objects.new('Late morning sun',sun_data);sun.rotation_euler=(.5,-.45,-.45);bpy.context.collection.objects.link(sun)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1440;scene.render.resolution_y=810;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(PREVIEW/'landing-world-v1.png')
scene.view_settings.look='AgX - Medium High Contrast'
scene.render.film_transparent=False
blend=SOURCE/'landing-world-v1.blend'
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'landing-world-v1.glb'),export_format='GLB',export_cameras=True,export_lights=False,export_animations=False,export_yup=True,export_extras=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
triangles=sum(len(p.vertices)-2 for obj in scene.objects if obj.type=='MESH' for p in obj.data.polygons)
manifest={'generator':'Blender '+bpy.app.version_string,'model':'landing-world-v1.glb','source':'assets/models/jumpyland/landing-world-v1.blend','projectionImage':False,'triangles':triangles,'meshCount':len(batches),'anchors':[{'name':'WorldAnchor'+str(i+1),'position':[x,z,-y]} for i,(x,y,z) in enumerate(anchors)],'camera':{'position':[camera.location.x,camera.location.z,-camera.location.y],'target':[target.x,target.z,-target.y],'verticalFov':math.degrees(2*math.atan(36/(1440/810)/2/camera_data.lens))},'textures':'Existing CC0 Poly Haven PBR maps; see ../pbr/ASSET-CREDITS.json'}
(OUT/'landing-world-v1.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print('MODEL_EXPORTED',json.dumps(manifest),flush=True)
bpy.ops.render.render(write_still=True)
print('RENDER_COMPLETE',scene.render.filepath,flush=True)
camera.location=(23,-61,37);camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(PREVIEW/'landing-world-side-v1.png');bpy.ops.render.render(write_still=True)
print('SIDE_RENDER_COMPLETE',scene.render.filepath,flush=True)
