function twoSum(arr:number[], t:number): number[]{
    for (let i = 0; i < arr.length - 1; i++){
        for (let j = i +1; j < arr.length; j++){
            if (arr[i] + arr[j] == t) return [i,j];
        }
    }
    return [-1, -1]
}