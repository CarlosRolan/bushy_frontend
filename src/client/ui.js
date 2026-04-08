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

// Item box (top-center, Mario Kart style)
function updateItemBox(itemType) {
  const icon  = document.getElementById('itemIcon');
  const label = document.getElementById('itemLabel');
  const box   = document.getElementById('itemBox');

  if (!itemType) {
    icon.textContent  = '?';
    label.textContent = '';
    box.className     = '';
  } else {
    const meta = { spring: { icon: '🌀', label: 'SPRING' }, ladder: { icon: '🪜', label: 'LADDER' } };
    icon.textContent  = meta[itemType].icon;
    label.textContent = meta[itemType].label + ' · [E] to use';
    box.className     = 'has-item';
  }
}

export { updateInfoPanel, updateItemBox }