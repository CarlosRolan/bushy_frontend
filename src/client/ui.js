function updateInfoPanel(pos, rot) {
 const { x, y, z } = pos;
 
 const pX = document.getElementById("infoX");
 const pY = document.getElementById("infoY");
 const pZ = document.getElementById("infoZ");
 const pRot = document.getElementById("infoRotation");

 pX.innerText = "X[" + round(x) + "]";
 pY.innerText = "Y[" + round(y)  + "]";
 pZ.innerText = "Z[" + round(z)  + "]";
 pRot.innerText = "R[" + round(rot)  + "]";
}

function round(n) {
 return Math.round(n * 1000) / 1000;

}

export {
 updateInfoPanel
}