#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>

typedef struct _Node {
  int item;
  struct _Node *next;
} Node;

typedef struct _LinkedList {
  Node *head;
} LinkedList;

LinkedList createLinkedList();
void removeLinkedList(LinkedList *list);

int getSize(LinkedList *list);
Node *getNode(LinkedList *list, int index);
void insert(LinkedList *list, int item, int index);
void delete(LinkedList *list, int index);
void deleteAll(LinkedList *list);
void reverse(LinkedList *list);
void printItems(LinkedList *list);

int main() {
  LinkedList list = createLinkedList();

  // 1. Insertion
  printf("1. Insertion:\n");
  insert(&list, 1, 0);
  printItems(&list); // 1 -> NULL

  insert(&list, 2, 1);
  printItems(&list); // 1 -> 2 -> NULL

  insert(&list, 3, 1);
  printItems(&list); // 1 -> 3 -> 2 -> NULL

  insert(&list, 4, 1);
  printItems(&list); // 1 -> 4 -> 3 -> 2 -> NULL

  insert(&list, 4, 6); // Error: index is out of range
  insert(&list, 4, -1); // Error: index is out of range

  // 2. Deletion
  printf("\n2. Deletion:\n");
  delete(&list, 0);
  printItems(&list); // 4 -> 3 -> 2 -> NULL

  delete(&list, 1);
  printItems(&list); // 4 -> 2 -> NULL

  delete(&list, -1); // Error: index is out of range
  delete(&list, 2); // Error: index is out of range

  deleteAll(&list);
  printItems(&list); // NULL

  // 3. Reversion
  printf("\n3. Reversion:\n");
  insert(&list, 1, 0);
  insert(&list, 2, 1);
  insert(&list, 3, 1);
  insert(&list, 4, 1);
  printItems(&list); // 1 -> 4 -> 3 -> 2 -> NULL
  reverse(&list);
  printItems(&list); // 2 -> 3 -> 4 -> 1 -> NULL

  removeLinkedList(&list);
  return 0;
}

LinkedList createLinkedList() {
  LinkedList newList;
  newList.head = NULL;
  return newList;
}

void removeLinkedList(LinkedList *list) {
  deleteAll(list);
}

int getSize(LinkedList *list) {
  // Starting from the head, count non-NULL nodes
  Node *node = list->head;
  int size = 0;

  // #######################
  // # Fill your code here #
  // #######################
  while (node != NULL) {
    node = node->next;
    size ++;
  }
  return size;
}

Node* getNode(LinkedList *list, int index) {
  // starting from the head, find the index-th element
  // return head if index <= 0
  // return NULL if index >= getSize(list)
  Node *node = list->head;
  
  // #######################
  // # Fill your code here #
  // #######################
  while (node != NULL && index > 0) {
    node = node->next;
    index --;
  }
  return node;
}

void insert(LinkedList *list, int item, int index) {
  Node *newNode = (Node *)malloc(sizeof(Node));
  newNode->item = item;

  // if index is negative
  if (index < 0) {
    printf("Error: index is out of range\n");
    return;
  }

  // if insert item at the first
  if (index == 0) {
    newNode->next = list->head;
    list->head = newNode;
    return;
  }

  Node *prevNode = getNode(list, index-1);
  if (prevNode == NULL) { // index is out of range
    printf("Error: index is out of range\n");
    return;
  }

  // prevNode -> newNode -> nextNode
  // #######################
  // # Fill your code here #
  // #######################
  Node *nextNode = prevNode->next;
  prevNode->next = newNode;
  newNode->next = nextNode;
}

void delete(LinkedList *list, int index) {
  // if index is negative or if list is empty
  if (index < 0 || list->head == NULL) {
    printf("Error: index is out of range\n");
    return;
  }

  if (index == 0) { // when deleting the first element
    Node *oldHead = list->head;
    list->head = oldHead->next;
    free(oldHead);
    return;
  }

  Node *prevNode = getNode(list, index-1);
  if (prevNode == NULL || prevNode->next == NULL) {
    printf("Error: index is out of range\n");
    return;
  }

  // (prev -> curr -> next) => (prev -> next)
  // #######################
  // # Fill your code here #
  // #######################
  Node *currNode = prevNode->next;
  Node *nextNode = currNode->next;
  prevNode->next = nextNode;
  free(currNode);
}

void deleteAll(LinkedList *list) {
  while (list->head != NULL) { // if list is not empty,
    delete(list, 0);           // then delete the first node
  }
}

void reverse(LinkedList *list) {
  if (list->head == NULL || list->head->next == NULL) {
    // nothing to do if you have zero or one element
    return;
  }

  // #######################
  // # Fill your code here #
  // #######################
  Node *prevNode = NULL, *currNode = list->head, *nextNode;
  while (currNode != NULL) {
    nextNode = currNode->next;
    currNode->next = prevNode;
    prevNode = currNode;
    currNode = nextNode;
  }
  list->head = prevNode;
}

void printItems(LinkedList *list) {
  Node *node = list->head;
  while (node != NULL) {
    printf("%d -> ", node->item);
    node = node->next;
  }
  printf("NULL (size: %d)\n", getSize(list));
}
