#include <stdio.h>

// 삽입 정렬 함수
void insertion_sort(int* arr, int size) {
    for (int i = 1; i < size; i++) {
        int k = arr[i];
        int j = i - 1; //key의 왼쪽에 있는 마지막 정렬된 값

        // 정렬된 영역에서 key보다 큰 값은 오른쪽으로 이동
        while (j >= 0 && arr[j] > k) {
            arr[j + 1] = arr[j];
            j--;
        }

        // key를 올바른 위치에 삽입
        arr[j + 1] = k;
    }
}

int main() {
    int arr[] = {5, 2, 4, 6, 1, 3}; // 예시 배열
    int size = sizeof(arr) / sizeof(arr[0]);

    printf("정렬 전 배열: ");
    for (int i = 0; i < size; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");

    insertion_sort(arr, size); // 삽입 정렬 호출

    printf("정렬 후 배열: ");
    for (int i = 0; i < size; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");

    return 0;
}
