import {StyleSheet} from 'react-native';

const Utils = {
  getUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        var r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      },
    );
  },
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginTop: 0,
  },
  sliderContainer: {
    marginTop: 10,
  },
  paddedText: {
    fontSize: 16,
    paddingLeft: 0.4,
    paddingTop: 10,
    paddingRight: 0.4,
    paddingBottom: 0.4,
    backgroundColor: '#e0f2f1',
  },
  scrollView: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  button: {
    width: 300,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  text: {
    color: '#007AFF',
    fontSize: 16,
  },
  sectionContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#2c3e50',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 5,
  },
  input: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    marginBottom: 10,
    backgroundColor: 'white',
  },
  srSwitchContainter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingVertical: 5,
  },
  srButtonContainter: {
    marginBottom: 15,
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  pickerWrapper: {
    backgroundColor: 'white',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 5,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
  },
  picker: {
    width: '100%',
    height: 150,
    color: '#000', // Ensure picker text is opaque
  },
  pickerItem: {
    color: '#000', // Ensure picker item text is opaque
    backgroundColor: 'white', // Picker item background color
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    backgroundColor: '#2196F3',
    borderRadius: 5,
    alignItems: 'center',
  },
  confirmText: {
    fontSize: 16,
    color: 'white',
  },
  selectedText: {
    fontSize: 16,
    color: '#3498db',
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  listItemDescription: {
    fontSize: 14,
    color: '#666',
  },
  imageContainer: {
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 4,
    marginBottom: 10,
  },
  imageCaption: {
    fontSize: 14,
    color: '#666',
  },
  listItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  list: {
    height: 50,
    paddingLeft: 20,
    justifyContent: 'center',
    borderBottomColor: '#aaa',
    borderBottomWidth: 0.2,
    alignItems: 'baseline',
  },
  space: {
    marginTop: 8,
  },
  redText: {
    marginLeft: 12,
    color: 'red',
    fontSize: 20,
    fontWeight: 'bold',
  },
  leftMargin: {
    marginLeft: 12,
  },
});

export {Utils, styles};
