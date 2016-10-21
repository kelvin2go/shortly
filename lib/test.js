var A = [4,6,3,2,345,44,777,12,33];

for ( var i = 1; i < A.length; i++){
  var next = A[i];
  var cur = i - 1;
  while( cur>=0 && A[cur] > next ){
    A[cur+1]=A[cur];
    cur=cur-1;
  }
  A[cur+1]=next;
}
