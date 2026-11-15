import numpy as np
from PIL import Image, ImageFilter
def erode(m, n):
    return np.asarray(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MinFilter(2*n+1)))>0
def hsv(a):
    r,g,b=a[...,0]/255,a[...,1]/255,a[...,2]/255; mx=np.max([r,g,b],0); mn=np.min([r,g,b],0); d=mx-mn+1e-9
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60; return h,d/(mx+1e-9),mx
def metrics(path):
    im=np.asarray(Image.open(path).convert('RGBA')).astype(float); h,s,v=hsv(im); A=im[...,3]>0
    edge=A&~erode(A,3); mag=(h>=305)&(h<=345)&(s>0.45)&(v>0.45)
    return dict(opaque=int(A.sum()),edge=int(edge.sum()),magenta_edge=int((edge&mag).sum()),magenta_all=int((A&mag).sum()))
if __name__=='__main__': import sys; print(metrics(sys.argv[1]))
