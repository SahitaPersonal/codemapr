// Test file for complexity analysis
function complexFunction(a, b, c, d, e, f) {
  if (a > 0) {
    if (b > 0) {
      if (c > 0) {
        if (d > 0) {
          if (e > 0) {
            if (f > 0) {
              for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                  if (i === j) {
                    console.log('Match found');
                  } else if (i > j) {
                    console.log('i is greater');
                  } else {
                    console.log('j is greater');
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  
  switch (a) {
    case 1:
      return 'one';
    case 2:
      return 'two';
    case 3:
      return 'three';
    default:
      return 'other';
  }
}

class LargeClass {
  constructor() {
    this.prop1 = 1;
    this.prop2 = 2;
    this.prop3 = 3;
    this.prop4 = 4;
    this.prop5 = 5;
  }
  
  method1() { return 1; }
  method2() { return 2; }
  method3() { return 3; }
  method4() { return 4; }
  method5() { return 5; }
  method6() { return 6; }
  method7() { return 7; }
  method8() { return 8; }
  method9() { return 9; }
  method10() { return 10; }
}

function simpleFunction() {
  return 'simple';
}