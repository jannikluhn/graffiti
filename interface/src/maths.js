function addV(v1, v2) {
  let sum = [];
  for (let i = 0; i < v1.length; i++) {
    sum.push(v1[i] + v2[i]);
  }
  return sum;
}

function mulV(v, m) {
  let prod = [];
  for (let c of v) {
    prod.push(c * m);
  }
  return prod;
}

function divV(v, m) {
  return mulV(v, 1 / m);
}

function negV(v) {
  let neg = [];
  for (let c of v) {
    neg.push(-c);
  }
  return neg;
}

function subV(v1, v2) {
  return addV(v1, negV(v2));
}

export { addV, subV, mulV, divV, negV };
